import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAnnotatedSong } from '../hooks/useAnnotatedSong'
import { useSpeech } from '../hooks/useSpeech'
import { SongHeader } from '../components/song/SongHeader'
import { AudioPlayer } from '../components/song/AudioPlayer'
import { LyricsEditor } from '../components/song/LyricsEditor'
import { StageSelector } from '../components/song/StageSelector'
import { usePlayerStore } from '../stores/player-store'
import { useUIStore } from '../stores/ui-store'
import { ensureAudioUrl } from '../services/lyrics-service'
import { confirmFuriganaToken, ensureSongPersisted, ignoreMediumConfidenceLine, regenerateFurigana, setIgnoreAllMediumConfidenceHints, updateLyrics } from '../services/song-service'
import { computeDictionaryRomaji } from '../lib/furigana-service'
import { extractColorsCached } from '../lib/color-extract'
import type { ExtractedColors } from '../lib/color-extract'
import { listSavedLines, listSavedWords, toggleSavedLine, toggleSavedWord } from '../services/collections-service'
import { getMasteredWordKeys, getSongLearningProgress, setSongLearningStage, wordMasteryKey } from '../services/learning-service'
import type { Song, FuriganaToken } from '../types'
import type { PracticeStage } from '../types'

export function SongPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const neteaseId = id ? parseInt(id, 10) : null
  const isPreview = searchParams.get('preview') === '1'
  const { song, setSong, isLoading, error } = useAnnotatedSong(
    Number.isNaN(neteaseId) ? null : neteaseId,
    isPreview
  )
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const setPlayRangeEnd = usePlayerStore((s) => s.setPlayRangeEnd)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const _vocalEnergy = usePlayerStore((s) => s.vocalEnergy)
  const setNowPlaying = usePlayerStore((s) => s.setNowPlaying)
  void _vocalEnergy
  const audioSrc = usePlayerStore((s) => s.audioSrc)
  const setAudioSrc = usePlayerStore((s) => s.setAudioSrc)
  const [isRetryingAudio, setIsRetryingAudio] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const userScrollingRef = useRef(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevLineRef = useRef(-1)

  const [currentStage, setCurrentStage] = useState<PracticeStage>(1)
  const [masteredWordKeys, setMasteredWordKeys] = useState<Set<string>>(new Set())
  const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set())
  const [savedLineIds, setSavedLineIds] = useState<Set<string>>(new Set())
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerateFeedback, setRegenerateFeedback] = useState<{
    tone: 'success' | 'error' | 'info'
    text: string
  } | null>(null)
  const [furiganaHint, setFuriganaHint] = useState<FuriganaHint | null>(null)
  const [speakingLineIndex, setSpeakingLineIndex] = useState<number | null>(null)
  const { speak, stop: stopSpeech } = useSpeech()
  const [romajiEdit, setRomajiEdit] = useState<{
    lineIndex: number
    value: string
    isSaving: boolean
    isSuggesting?: boolean
    suggestion?: string
    feedback?: { tone: 'success' | 'error'; text: string }
  } | null>(null)
  const appearance = useUIStore((s) => s.appearance)
  const [albumColors, setAlbumColors] = useState<ExtractedColors | null>(null)
  const activeNeteaseId = song?.neteaseId

  useEffect(() => {
    let cancelled = false
    const colors = song?.albumArtUrl
      ? extractColorsCached(song.albumArtUrl)
      : Promise.resolve(null)
    colors.then((result) => {
      if (!cancelled) setAlbumColors(result)
    })
    return () => { cancelled = true }
  }, [song?.albumArtUrl])

  const safePanelColor = ensurePanelColor(appearance.lyricsPanelColor)
  const albumBg = albumColors?.dark
  const contrastBg = albumBg ?? safePanelColor
  const safePrimaryColor = albumColors
    ? ensureReadableTextColor('#f0f0f8', contrastBg, 5.2)
    : ensureReadableTextColor(appearance.lyricsTextColor, contrastBg, 5.2)
  const safeSecondaryColor = albumColors
    ? ensureReadableTextColor('#b8b8d0', contrastBg, 4)
    : ensureReadableTextColor(appearance.lyricsSubtextColor, contrastBg, 4)
  const safeAccentColor = albumColors
    ? ensureReadableTextColor('#ffffff', contrastBg, 3.2)
    : ensureReadableTextColor(appearance.lyricsAccentColor, contrastBg, 3.2)

  useEffect(() => {
    if (song) {
      setNowPlaying({
        title: song.title,
        artist: song.artist,
        albumArtUrl: song.albumArtUrl,
        neteaseId: song.neteaseId,
      })
    }
  }, [song, setNowPlaying])

  useEffect(() => {
    if (song) {
      ensureAudioUrl(song).then((s) => setAudioSrc(s.audioUrl))
    }
  }, [song, setAudioSrc])

  const handleRetryAudio = () => {
    if (!song) return
    setIsRetryingAudio(true)
    ensureAudioUrl(song, true).then((s) => {
      setAudioSrc(s.audioUrl)
      setIsRetryingAudio(false)
    })
  }

  useEffect(() => {
    Promise.all([listSavedWords(), listSavedLines()]).then(([words, lines]) => {
      setSavedWordIds(new Set(words.map((item) => item.id)))
      setSavedLineIds(new Set(lines.map((item) => item.id)))
    })
  }, [])

  useEffect(() => {
    if (!activeNeteaseId) return
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setCurrentStage(getSongLearningProgress(activeNeteaseId).currentStage)
      setMasteredWordKeys(getMasteredWordKeys())
    })
    return () => { cancelled = true }
  }, [activeNeteaseId])

  // Detect user scroll on the lyrics viewport
  useEffect(() => {
    const lyricsEl = lyricsRef.current
    if (!lyricsEl) return

    const onUserScroll = () => {
      userScrollingRef.current = true
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        userScrollingRef.current = false
      }, 10000)
    }

    lyricsEl.addEventListener('wheel', onUserScroll, { passive: true })
    lyricsEl.addEventListener('touchmove', onUserScroll, { passive: true })
    lyricsEl.addEventListener('scroll', onUserScroll, { passive: true })

    return () => {
      lyricsEl.removeEventListener('wheel', onUserScroll)
      lyricsEl.removeEventListener('touchmove', onUserScroll)
      lyricsEl.removeEventListener('scroll', onUserScroll)
    }
  }, [])

  // Auto-scroll only when the active line changes
  useEffect(() => {
    if (!isPlaying || userScrollingRef.current) return
    if (!song) return
    const currentLineIndex = findCurrentLine(song.lrcParsed ?? [], currentTimeMs, song.calibrations ?? {})
    if (currentLineIndex === prevLineRef.current) return
    prevLineRef.current = currentLineIndex
    if (currentLineIndex < 0) return
    const el = lyricsRef.current?.querySelector('.lyrics-line.active')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTimeMs, isPlaying, song])

  if (!id || Number.isNaN(neteaseId)) {
    return (
      <div className="page-shell p-6">
        <p className="text-danger">无效的歌曲 ID</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-shell p-6">
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">加载歌词...</p>
        </div>
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="page-shell p-6">
        <p className="text-danger">{error ?? '加载失败'}</p>
      </div>
    )
  }

  const displaySong = isEditing && editSong ? editSong : song
  const stageConfig = getStageConfig(currentStage)
  const lines = displaySong.stageLyrics?.[1] ?? []
  const furiganaData = displaySong.furiganaData ?? []
  const furiganaByIndex = new Map(furiganaData.map((fl) => [fl.lineIndex, fl]))
  const parsedLines = song.lrcParsed ?? []
  const calibrations = song.calibrations ?? {}
  const ignoreAllMediumHints = !!displaySong.ignoreAllMediumConfidenceHints
  const hasAnyMediumConfidence = furiganaData.some((line) => line.words.some((word) => word.confidence === 'medium'))
  const currentLineIndex = findCurrentLine(parsedLines, currentTimeMs, calibrations)

  const handleRegenerateFurigana = async () => {
    setIsRegenerating(true)
    setRegenerateFeedback({ tone: 'info', text: '正在重新生成注音，这首歌行数多时会稍微慢一点。' })
    try {
      if (isPreview) {
        const persisted = await ensureSongPersisted(song)
        setSong(persisted)
        if (isEditing) setEditSong(persisted)
      }
      const updated = await regenerateFurigana(song.neteaseId)
      if (updated) {
        setSong(updated)
        if (isEditing) setEditSong(updated)
        setRegenerateFeedback({
          tone: 'success',
          text: `注音已重算完成，共刷新 ${updated.furiganaData?.length ?? 0} 行。`,
        })
      } else {
        setRegenerateFeedback({
          tone: 'error',
          text: '重算失败，这首歌的本地数据没有更新。',
        })
      }
    } catch (error) {
      setRegenerateFeedback({
        tone: 'error',
        text: error instanceof Error ? `重算失败：${error.message}` : '重算失败，请稍后再试。',
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const jumpToLineAndPlay = (lineIndex: number) => {
    const calibration = calibrations[lineIndex]
    const startMs = calibration?.startMs ?? parsedLines[lineIndex]?.timeMs
    if (startMs === undefined) return

    setPlaying(false)
    setTimeout(() => {
      setPlayRangeEnd(null)
      setPendingSeek(startMs)
      setPlaying(true)
    }, 50)
  }

  const panelGradient = albumColors
    ? `linear-gradient(135deg, ${toRgba(albumColors.dark, 0.96)}, ${toRgba(darkenHex(albumColors.palette[2] ?? albumColors.dark, 0.5), 0.92)})`
    : toRgba(safePanelColor, Math.max(appearance.lyricsPanelOpacity, 0.76))

  return (
    <div
      className="page-shell pb-8 overflow-x-hidden"
      style={{
        ['--lyrics-panel-bg' as string]: panelGradient,
        ['--lyrics-line-base-bg' as string]: toRgba(safePrimaryColor, Math.max(appearance.lyricsLineOpacity, 0.12)),
        ['--lyrics-primary-color' as string]: safePrimaryColor,
        ['--lyrics-accent-color' as string]: safeAccentColor,
        ['--lyrics-furigana-color' as string]: safeSecondaryColor,
        ['--ktv-highlight-color' as string]: safeAccentColor,
        ['--lyrics-active-bg' as string]: toRgba(safeAccentColor, 0.12),
        ['--lyrics-secondary-color' as string]: safeSecondaryColor,
        ['--lyrics-muted-color' as string]: safeSecondaryColor,
      }}
    >
      <div className="sticky top-14 z-10 bg-surface/90 backdrop-blur-sm p-4 space-y-3">
        <SongHeader
          title={song.title}
          artist={song.artist}
          albumArtUrl={song.albumArtUrl}
          album={song.album}
        />
        <AudioPlayer src={audioSrc} onRetry={handleRetryAudio} isRetrying={isRetryingAudio} />
        <div className="space-y-2">
          <StageSelector
            currentStage={currentStage}
            onStageChange={(stage) => {
              setCurrentStage(stage)
              setSongLearningStage(song.neteaseId, stage)
            }}
          />
          <p className="text-[11px] text-text-muted">{stageConfig.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRegenerateFurigana}
            disabled={isRegenerating}
            className="px-3 py-1 rounded-full text-xs font-medium bg-surface-alt text-text-secondary border border-border hover:border-accent disabled:opacity-60"
          >
            {isRegenerating ? '重建中...' : '重生成注音'}
          </button>
          {hasAnyMediumConfidence && (
            <button
              onClick={async () => {
                const updated = await setIgnoreAllMediumConfidenceHints(song.neteaseId, !ignoreAllMediumHints)
                if (updated) {
                  setSong(updated)
                  if (isEditing) setEditSong(updated)
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                ignoreAllMediumHints
                  ? 'bg-cyan-400/12 text-cyan-700 border-cyan-400/30'
                  : 'bg-surface-alt text-text-secondary border-border hover:border-accent'
              }`}
            >
              {ignoreAllMediumHints ? '已忽略本歌中等提示' : '忽略本歌中等提示'}
            </button>
          )}
          <button
            onClick={() => {
              setIsEditing(!isEditing)
              setEditSong(isEditing ? null : { ...song })
            }}
            className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isEditing
                ? 'bg-accent text-white'
                : 'bg-surface-alt text-text-secondary hover:bg-surface-muted'
            }`}
          >
            {isEditing ? '完成' : '编辑'}
          </button>
        </div>
        {regenerateFeedback && (
          <div
            className={`rounded-lg px-3 py-2 text-xs ${
              regenerateFeedback.tone === 'success'
                ? 'bg-emerald-500/12 text-emerald-700'
                : regenerateFeedback.tone === 'error'
                  ? 'bg-red-500/10 text-red-600'
                  : 'bg-surface-alt text-text-secondary'
            }`}
          >
            {regenerateFeedback.text}
          </div>
        )}
      </div>

      {isEditing && editSong ? (
        <LyricsEditor
          song={editSong}
          calibrations={calibrations}
          onCalibrationsSave={(c) => setSong({ ...song!, calibrations: c })}
          onSongUpdate={setEditSong}
        />
      ) : (
        <div className="lyrics-viewport py-6 overflow-x-hidden" ref={lyricsRef}>
          {lines.map((line, i) => {
            if (!line.original.trim()) {
              return <div key={i} className="h-6" />
            }
            const fLine = furiganaByIndex.get(i)
            const hasFurigana = fLine && fLine.words.some((w) => w.isKanji)
            const lineProgress = isPlaying && stageConfig.ktv
              ? getLineProgress(parsedLines, i, currentTimeMs, calibrations[i])
              : 0
            const isActive = i === currentLineIndex && isPlaying

            const lineId = `${song.neteaseId}:${i}`
            const lineSaved = savedLineIds.has(lineId)
            const lineHasLowConfidence = !!fLine?.words.some((word) => word.confidence === 'low')
            const lineHasMediumConfidence = !!fLine?.words.some((word) => word.confidence === 'medium')
            const mediumIgnored = (displaySong.ignoredMediumConfidenceLineIndexes ?? []).includes(i)
            const lineHint = furiganaHint?.lineIndex === i ? furiganaHint : null
            const isEditingRomaji = romajiEdit?.lineIndex === i

            return (
              <div
                key={i}
                className={`lyrics-line relative px-4 py-1.5 ${
                  isActive ? 'active' : i < currentLineIndex ? 'played' : ''
                } cursor-pointer`}
                onClick={() => jumpToLineAndPlay(i)}
              >
                <div className="lyrics-line-base" />
                <div className={`lyrics-line-bg ${isActive ? 'active' : ''}`} />
                <div className="relative z-10">
                  <KTVLine progress={lineProgress}>
                  {hasFurigana ? (
                      <FuriganaText
                        tokens={fLine.words}
                        showReading={(token) => stageConfig.furigana && (
                          currentStage !== 3 || !masteredWordKeys.has(wordMasteryKey(token.surface, token.reading))
                        )}
                        savedWordIds={savedWordIds}
                        onWordSelect={(token, tokenIndex) => {
                          const wordId = `${song.neteaseId}:${i}:${token.surface}:${token.reading}`
                          setFuriganaHint({
                            lineIndex: i,
                            tokenIndex,
                            surface: token.surface,
                            reading: token.reading,
                            confidence: token.confidence ?? 'high',
                            source: token.source,
                            saved: savedWordIds.has(wordId),
                          })
                        }}
                        wordIdForToken={(token) => `${song.neteaseId}:${i}:${token.surface}:${token.reading}`}
                      />
                  ) : (
                    <div className="text-line">{line.original}</div>
                  )}
                  </KTVLine>
                  {stageConfig.furigana && (lineHasLowConfidence || (lineHasMediumConfidence && !mediumIgnored && !ignoreAllMediumHints)) && (
                    <div className={`mt-1 text-[11px] ${
                      lineHasLowConfidence ? 'text-warning' : 'text-text-muted'
                    }`}>
                      {lineHasLowConfidence ? '这句里有低置信度注音，点具体单词可查看原因。' : '这句里有中等置信度注音，点具体单词可查看来源。'}
                    </div>
                  )}
                  {lineHint && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`mt-2 rounded-xl border px-4 py-3 text-left text-sm shadow-lg ${
                      lineHint.confidence === 'low'
                        ? 'border-warning/45 bg-slate-900/88 text-slate-100'
                        : 'border-cyan-400/35 bg-slate-900/88 text-slate-100'
                    }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-3">
                            <p className="font-semibold text-slate-50">
                              {lineHint.surface}
                            </p>
                            <span className="text-sm text-slate-300">{lineHint.reading}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-slate-200">
                            {getConfidenceDescription(lineHint)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {lineHint.saved ? '已加入生词本，后面可以在曲库页继续整理。' : '尚未加入生词本。'}
                          </p>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation()
                              const wordId = `${song.neteaseId}:${i}:${lineHint.surface}:${lineHint.reading}`
                              const saved = await toggleSavedWord({
                                id: wordId,
                                neteaseId: song.neteaseId,
                                songTitle: song.title,
                                artist: song.artist,
                                lineIndex: i,
                                lineText: line.original,
                                surface: lineHint.surface,
                                reading: lineHint.reading,
                              })
                              setSavedWordIds((prev) => {
                                const next = new Set(prev)
                                if (saved) next.add(wordId)
                                else next.delete(wordId)
                                return next
                              })
                              setFuriganaHint((prev) => prev?.lineIndex === i ? { ...prev, saved } : prev)
                            }}
                            className={`mt-3 rounded-full px-3 py-1.5 text-xs font-medium ${
                              lineHint.saved
                                ? 'border border-white/15 bg-white/8 text-slate-200'
                                : 'bg-cyan-400 text-slate-950'
                            }`}
                          >
                            {lineHint.saved ? '移出生词本' : '加入生词本'}
                          </button>
                          <div className="mt-3">
                            {isEditingRomaji ? (
                              <div className="space-y-3">
                                <div className="rounded-xl bg-slate-950/35 p-3 ring-1 ring-white/8">
                                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                                    Romaji
                                  </label>
                                  <input
                                    type="text"
                                    value={romajiEdit.value}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setRomajiEdit((prev) => prev && prev.lineIndex === i
                                        ? { ...prev, value: e.target.value, feedback: undefined }
                                        : prev)
                                    }
                                    className="w-full rounded-lg border border-slate-500 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400"
                                    placeholder="修正这句罗马音"
                                  />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={romajiEdit.isSuggesting}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      setRomajiEdit((prev) => prev && prev.lineIndex === i
                                        ? { ...prev, isSuggesting: true, feedback: undefined }
                                        : prev)
                                      try {
                                        const suggestion = await computeDictionaryRomaji(line.original)
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i
                                          ? suggestion
                                            ? {
                                              ...prev,
                                              suggestion,
                                              isSuggesting: false,
                                            }
                                            : {
                                              ...prev,
                                              isSuggesting: false,
                                              feedback: { tone: 'error', text: '这句暂时没有可用的词典参考。' },
                                            }
                                          : prev)
                                      } catch {
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i
                                          ? {
                                            ...prev,
                                            isSuggesting: false,
                                            feedback: { tone: 'error', text: '词典参考获取失败，请稍后再试。' },
                                          }
                                          : prev)
                                      }
                                    }}
                                    className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-900 hover:bg-slate-100"
                                  >
                                    {romajiEdit.isSuggesting ? '参考生成中...' : '词典参考'}
                                  </button>
                                  {romajiEdit.suggestion && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i
                                          ? {
                                            ...prev,
                                            value: prev.suggestion ?? prev.value,
                                            feedback: {
                                              tone: 'success',
                                              text: '已带入词典参考，你可以再微调后保存。',
                                            },
                                          }
                                          : prev)
                                      }}
                                      className="rounded-full bg-cyan-400/18 px-3 py-1.5 text-[11px] font-medium text-cyan-200"
                                    >
                                      带入推荐
                                    </button>
                                  )}
                                </div>
                                {romajiEdit.suggestion && (
                                  <div className="rounded-xl bg-slate-800/80 px-3 py-2 text-[12px] text-slate-200 ring-1 ring-slate-700">
                                    <span className="text-slate-400">词典参考</span>
                                    <span className="ml-2">{romajiEdit.suggestion}</span>
                                  </div>
                                )}
                                {romajiEdit.feedback && (
                                  <div
                                    className={`rounded-xl px-3 py-2 text-[12px] ${
                                      romajiEdit.feedback.tone === 'success'
                                        ? 'bg-emerald-500/18 text-emerald-200'
                                        : 'bg-red-500/18 text-red-200'
                                    }`}
                                  >
                                    {romajiEdit.feedback.text}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      if (lineHint.tokenIndex === undefined) return
                                      const updated = await confirmFuriganaToken(song.neteaseId, i, lineHint.tokenIndex)
                                      if (updated) {
                                        setSong(updated)
                                        if (isEditing) setEditSong(updated)
                                        setFuriganaHint(null)
                                      }
                                    }}
                                    className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium text-slate-100"
                                  >
                                    确认这个标注
                                  </button>
                                  <button
                                    type="button"
                                    disabled={romajiEdit.isSaving}
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const value = romajiEdit.value.trim()
                                      if (!value) {
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i
                                          ? {
                                            ...prev,
                                            feedback: { tone: 'error', text: '请先输入这句的罗马音。' },
                                          }
                                          : prev)
                                        return
                                      }
                                      setRomajiEdit((prev) => prev && prev.lineIndex === i
                                        ? { ...prev, isSaving: true, feedback: undefined }
                                        : prev)
                                      try {
                                        if (isPreview) {
                                          const persisted = await ensureSongPersisted(song)
                                          setSong(persisted)
                                          if (isEditing) setEditSong(persisted)
                                        }
                                        const updated = await updateLyrics(song.neteaseId, [
                                          { timeMs: line.timeMs, romaji: value },
                                        ])
                                        if (updated) {
                                          setSong(updated)
                                          if (isEditing) setEditSong(updated)
                                          setRomajiEdit((prev) => prev && prev.lineIndex === i
                                            ? {
                                              ...prev,
                                              value,
                                              isSaving: false,
                                              feedback: { tone: 'success', text: '已保存，并已按新的罗马音重算这句注音。' },
                                            }
                                            : prev)
                                        } else {
                                          setRomajiEdit((prev) => prev && prev.lineIndex === i
                                            ? {
                                              ...prev,
                                              isSaving: false,
                                              feedback: { tone: 'error', text: '保存失败，这首歌的本地数据没有更新。' },
                                            }
                                            : prev)
                                        }
                                      } catch {
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i
                                          ? {
                                            ...prev,
                                            isSaving: false,
                                            feedback: { tone: 'error', text: '保存失败，请再试一次。' },
                                          }
                                          : prev)
                                      } finally {
                                        setRomajiEdit((prev) => prev && prev.lineIndex === i && prev.isSaving
                                          ? { ...prev, isSaving: false }
                                          : prev)
                                      }
                                    }}
                                    className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
                                  >
                                    {romajiEdit.isSaving ? '保存中...' : '保存并重算注音'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={romajiEdit.isSaving}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setRomajiEdit(null)
                                    }}
                                    className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-xs font-medium text-slate-100"
                                  >
                                    取消
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRomajiEdit({
                                      lineIndex: i,
                                      value: line.romaji || '',
                                      isSaving: false,
                                      isSuggesting: false,
                                    })
                                  }}
                                  className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-900 hover:bg-slate-100"
                                >
                                  修正这句罗马音
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (lineHint.tokenIndex === undefined) return
                                    const updated = await confirmFuriganaToken(song.neteaseId, i, lineHint.tokenIndex)
                                    if (updated) {
                                      setSong(updated)
                                      if (isEditing) setEditSong(updated)
                                      setFuriganaHint(null)
                                    }
                                  }}
                                  className="rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-100"
                                >
                                  确认这个标注
                                </button>
                                {lineHint.confidence === 'medium' && (
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      const updated = await ignoreMediumConfidenceLine(song.neteaseId, i)
                                      if (updated) {
                                        setSong(updated)
                                        if (isEditing) setEditSong(updated)
                                        setFuriganaHint(null)
                                      }
                                    }}
                                    className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200"
                                  >
                                    忽略这句中等提示
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFuriganaHint(null)
                            setRomajiEdit(null)
                          }}
                          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[11px] text-slate-300 hover:bg-white/10"
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  )}
                  {stageConfig.romaji && line.romaji && (
                    <div className="romaji">
                      <KTVLine progress={lineProgress}>
                        {line.romaji}
                      </KTVLine>
                    </div>
                  )}
                  {stageConfig.translation && line.translation && (
                    <div className="translation">{line.translation}</div>
                  )}
                  <div className="lyrics-line-actions mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        jumpToLineAndPlay(i)
                      }}
                      className="rounded px-2.5 py-1 text-[11px] font-medium bg-surface/82 text-text-secondary ring-1 ring-black/8 hover:bg-surface"
                    >
                      播放此句
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const saved = await toggleSavedLine({
                          id: lineId,
                          neteaseId: song.neteaseId,
                          songTitle: song.title,
                          artist: song.artist,
                          lineIndex: i,
                          lineText: line.original,
                          romaji: line.romaji || undefined,
                          translation: line.translation || undefined,
                        })
                        setSavedLineIds((prev) => {
                          const next = new Set(prev)
                          if (saved) next.add(lineId)
                          else next.delete(lineId)
                          return next
                        })
                      }}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        lineSaved
                          ? 'bg-accent/20 text-accent ring-1 ring-accent/25'
                          : 'bg-surface/82 text-text-secondary ring-1 ring-black/8 hover:bg-surface'
                      }`}
                    >
                      {lineSaved ? '已收藏' : '收藏此句'}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (speakingLineIndex === i) {
                          stopSpeech()
                          setSpeakingLineIndex(null)
                        } else {
                          stopSpeech()
                          speak(line.original)
                          setSpeakingLineIndex(i)
                          setTimeout(() => setSpeakingLineIndex(null), 3000)
                        }
                      }}
                      className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                        speakingLineIndex === i
                          ? 'bg-accent/30 text-accent ring-1 ring-accent/25'
                          : 'bg-surface/82 text-text-secondary ring-1 ring-black/8 hover:bg-surface'
                      }`}
                    >
                      {speakingLineIndex === i ? '停止朗读' : '朗读此句'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KTVLine({ progress, children }: { progress: number; children: React.ReactNode }) {
  if (progress <= 0) return <>{children}</>

  return (
    <div className="inline-block relative max-w-full text-left">
      <div className="opacity-30">{children}</div>
      <div
        className="ktv-highlight absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
      >
        {children}
      </div>
    </div>
  )
}

function FuriganaText({
  tokens,
  showReading,
  savedWordIds,
  onWordSelect,
  wordIdForToken,
}: {
  tokens: FuriganaToken[]
  showReading: (token: FuriganaToken) => boolean
  savedWordIds: Set<string>
  onWordSelect: (token: FuriganaToken, tokenIndex: number) => void
  wordIdForToken: (token: FuriganaToken) => string
}) {
  return (
    <div className="text-line">
      {tokens.map((token, i) => {
        if (token.isKanji && token.reading) {
          const saved = savedWordIds.has(wordIdForToken(token))
          const confidenceClass = token.confidence === 'low'
            ? 'furigana-low'
            : token.confidence === 'medium'
              ? 'furigana-medium'
              : ''
          if (showReading(token)) {
            return (
              <button
                key={i}
                type="button"
                aria-label={`${token.surface}，读作${token.reading}，查看详情`}
                title={token.confidence === 'low' ? '注音可信度较低，点按查看详情' : token.confidence === 'medium' ? '注音可信度中等，点按查看详情' : '查看读音详情'}
                onClick={(e) => {
                  e.stopPropagation()
                  onWordSelect(token, i)
                }}
                className={`inline-flex items-end rounded-sm px-0.5 align-baseline ${confidenceClass} ${saved ? 'furigana-saved' : ''}`}
              >
                <ruby>{token.surface}<rp>(</rp><rt>{token.reading}</rt><rp>)</rp></ruby>
              </button>
            )
          }
          return (
            <button
            key={i}
            type="button"
            aria-label={`${token.surface}，读作${token.reading}，查看详情`}
            title={token.confidence === 'low' ? '注音可信度较低，点按查看详情' : token.confidence === 'medium' ? '注音可信度中等，点按查看详情' : '查看读音详情'}
            onClick={(e) => {
              e.stopPropagation()
              onWordSelect(token, i)
            }}
            className={`inline-flex items-end rounded-sm px-0.5 ${confidenceClass} ${saved ? 'furigana-saved' : ''}`}
          >
            <span>{token.surface}</span>
            </button>
          )
        }
        return <span key={i}>{token.surface}</span>
      })}
    </div>
  )
}

type FuriganaHint = {
  lineIndex: number
  tokenIndex?: number
  surface: string
  reading: string
  confidence: 'high' | 'medium' | 'low'
  source?: FuriganaToken['source']
  saved: boolean
}

function getStageConfig(stage: PracticeStage) {
  const configs = {
    1: { furigana: true, romaji: true, translation: true, ktv: false, description: '全辅助：注音、罗马音与翻译同时显示。' },
    2: { furigana: true, romaji: false, translation: true, ktv: false, description: '隐藏罗马音，依靠假名注音阅读。' },
    3: { furigana: true, romaji: false, translation: true, ktv: false, description: '已掌握的词不再显示注音，只提示待复习生词。' },
    4: { furigana: false, romaji: false, translation: true, ktv: false, description: '无注音阅读，仍保留翻译作为核对。' },
    5: { furigana: false, romaji: false, translation: false, ktv: true, description: '只看原文，跟随播放进度进行 KTV 跟唱。' },
  } as const
  return configs[stage]
}

function getConfidenceDescription(hint: FuriganaHint): string {
  if (hint.source === 'reading_override') {
    return '这条注音来自项目内置的专名校正，已按高置信度处理。'
  }
  if (hint.source === 'romaji_fallback') {
    return '这条注音是根据罗马音兜底推出来的，原始罗马音不完整或分词不稳时，准确率会下降。'
  }
  if (hint.source === 'romaji_strict') {
    return '这条注音是按罗马音严格对齐得到的。只要原始罗马音有省略或写法变化，就可能出现偏差。'
  }
  if (hint.source === 'tokenizer') {
    return hint.confidence === 'low'
      ? '分词器给出了不够稳定的读音，这里先保守展示，建议结合听感再核对。'
      : '这条注音来自分词器，但命中的是中等置信度结果，通常可用，个别歌词写法仍可能偏。'
  }
  return hint.confidence === 'low'
    ? '这条注音当前置信度偏低，建议结合音频或歌词上下文再看一眼。'
    : '这条注音当前是中等置信度，通常够用，但不是最稳的一档。'
}

function getLineProgress(
  lines: { timeMs: number }[],
  lineIndex: number,
  currentTimeMs: number,
  calibration?: { startMs: number; endMs: number },
): number {
  const { start, end } = getLineWindow(lines, lineIndex, calibration)
  if (end <= start) return currentTimeMs >= start ? 1 : 0
  const displayTimeMs = getDisplayTimeMs(currentTimeMs, calibration)
  return Math.max(0, Math.min(1, (displayTimeMs - start) / (end - start)))
}

function findCurrentLine(
  lines: { timeMs: number }[],
  currentTimeMs: number,
  calibrations: Record<number, { startMs: number; endMs: number }>,
): number {
  if (lines.length === 0) return -1
  let currentLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const calibration = calibrations[i]
    const { start } = getLineWindow(lines, i, calibration)
    const displayTimeMs = getDisplayTimeMs(currentTimeMs, calibration, 100)
    if (displayTimeMs < start) {
      break
    }
    currentLineIndex = i
  }
  return currentLineIndex
}

function getDisplayTimeMs(
  currentTimeMs: number,
  calibration?: { startMs: number; endMs: number },
  extraLeadMs = 0,
): number {
  return currentTimeMs + (calibration ? 0 : 300) + extraLeadMs
}

function getLineWindow(
  lines: { timeMs: number }[],
  lineIndex: number,
  calibration?: { startMs: number; endMs: number },
): { start: number; end: number } {
  const start = calibration?.startMs ?? lines[lineIndex].timeMs
  const fallbackEnd = lineIndex + 1 < lines.length ? lines[lineIndex + 1].timeMs : start + 5000
  const end = calibration?.endMs ?? fallbackEnd
  return { start, end: Math.max(end, start) }
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex) ?? { r: 15, g: 23, b: 42 }
  return rgbToHex({ r: r * (1 - amount), g: g * (1 - amount), b: b * (1 - amount) })
}

function toRgba(hex: string | undefined, alpha: number | undefined): string {
  const safeHexInput = typeof hex === 'string' && hex.trim() ? hex : '#131625'
  const safeAlpha = typeof alpha === 'number' && Number.isFinite(alpha) ? alpha : 0.68
  const normalized = safeHexInput.replace('#', '')
  const safeHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(safeHex, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`
}

function ensurePanelColor(hex: string | undefined): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#0f172a'

  const luminance = relativeLuminance(rgb)
  if (luminance <= 0.18) return rgbToHex(rgb)

  return rgbToHex(mixRgb(rgb, { r: 15, g: 23, b: 42 }, 0.55))
}

function ensureReadableTextColor(
  foregroundHex: string | undefined,
  backgroundHex: string | undefined,
  minimumContrast: number,
): string {
  const foreground = hexToRgb(foregroundHex) ?? { r: 255, g: 255, b: 255 }
  const background = hexToRgb(backgroundHex) ?? { r: 15, g: 23, b: 42 }

  let best = foreground
  let bestContrast = contrastRatio(foreground, background)
  if (bestContrast >= minimumContrast) return rgbToHex(best)

  const whiteContrast = contrastRatio({ r: 255, g: 255, b: 255 }, background)
  const blackContrast = contrastRatio({ r: 0, g: 0, b: 0 }, background)

  if (whiteContrast >= blackContrast) {
    best = { r: 255, g: 255, b: 255 }
    bestContrast = whiteContrast
  } else {
    best = { r: 0, g: 0, b: 0 }
    bestContrast = blackContrast
  }

  if (bestContrast >= minimumContrast) return rgbToHex(best)
  return rgbToHex(best)
}

function hexToRgb(hex: string | undefined): { r: number; g: number; b: number } | null {
  if (!hex?.trim()) return null
  const normalized = hex.replace('#', '')
  const safeHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized.padEnd(6, '0').slice(0, 6)
  const value = Number.parseInt(safeHex, 16)
  if (Number.isNaN(value)) return null

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
}

function mixRgb(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  weight: number,
): { r: number; g: number; b: number } {
  return {
    r: from.r + (to.r - from.r) * weight,
    g: from.g + (to.g - from.g) * weight,
    b: from.b + (to.b - from.b) * weight,
  }
}

function contrastRatio(
  first: { r: number; g: number; b: number },
  second: { r: number; g: number; b: number },
): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channels = [r, g, b].map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}
