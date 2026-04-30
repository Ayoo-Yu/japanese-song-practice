import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAnnotatedSong } from '../hooks/useAnnotatedSong'
import { useSpeech } from '../hooks/useSpeech'
import { SongHeader } from '../components/song/SongHeader'
import { AudioPlayer } from '../components/song/AudioPlayer'
import { LyricsEditor } from '../components/song/LyricsEditor'
import { LyricsLineItem } from '../components/song/LyricsLineItem'
import type { FuriganaHint, RomajiEditState } from '../components/song/lyrics-types'
import { SongToolbar } from '../components/song/SongToolbar'
import { usePlayerStore } from '../stores/player-store'
import { useUIStore } from '../stores/ui-store'
import { ensureAudioUrl } from '../services/lyrics-service'
import { ensureSongPersisted, regenerateFurigana, setIgnoreAllMediumConfidenceHints } from '../services/song-service'
import { extractColorsCached } from '../lib/color-extract'
import type { ExtractedColors } from '../lib/color-extract'
import { isCreditLineText } from '../lib/song-lines'
import { listSavedLines, listSavedWords, toggleSavedLine } from '../services/collections-service'
import type { Song } from '../types'

export function SongPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const neteaseId = id ? parseInt(id, 10) : null
  const isPreview = searchParams.get('preview') === '1'
  const focusLineIndex = useMemo(() => {
    const value = searchParams.get('line')
    if (!value) return null
    const parsed = Number(value)
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
  }, [searchParams])
  const { song, setSong, isLoading, error } = useAnnotatedSong(
    Number.isNaN(neteaseId) ? null : neteaseId,
    isPreview
  )
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const setPlayRangeEnd = usePlayerStore((s) => s.setPlayRangeEnd)
  const loopRange = usePlayerStore((s) => s.loopRange)
  const setLoopRange = usePlayerStore((s) => s.setLoopRange)
  const playbackRate = usePlayerStore((s) => s.playbackRate)
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate)
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
  const handledFocusLineRef = useRef<string | null>(null)

  const [showFurigana, setShowFurigana] = useState(true)
  const [showRomaji, setShowRomaji] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [showKTV, setShowKTV] = useState(true)
  const [loopLineIndex, setLoopLineIndex] = useState<number | null>(null)
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
  const [romajiEdit, setRomajiEdit] = useState<RomajiEditState | null>(null)
  const appearance = useUIStore((s) => s.appearance)
  const [albumColors, setAlbumColors] = useState<ExtractedColors | null>(null)

  useEffect(() => {
    let cancelled = false
    if (song?.albumArtUrl) {
      extractColorsCached(song.albumArtUrl).then((colors) => {
        if (!cancelled) setAlbumColors(colors)
      })
    }
    return () => { cancelled = true }
  }, [song?.albumArtUrl])

  const currentAlbumColors = song?.albumArtUrl ? albumColors : null
  const safePanelColor = ensurePanelColor(appearance.lyricsPanelColor)
  const albumBg = currentAlbumColors?.dark
  const contrastBg = albumBg ?? safePanelColor
  const safePrimaryColor = currentAlbumColors
    ? ensureReadableTextColor('#f0f0f8', contrastBg, 5.2)
    : ensureReadableTextColor(appearance.lyricsTextColor, contrastBg, 5.2)
  const safeSecondaryColor = currentAlbumColors
    ? ensureReadableTextColor('#b8b8d0', contrastBg, 4)
    : ensureReadableTextColor(appearance.lyricsSubtextColor, contrastBg, 4)
  const safeAccentColor = currentAlbumColors
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

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      setLoopRange(null)
      setLoopLineIndex(null)
    })
    return () => { cancelled = true }
  }, [song?.neteaseId, setLoopRange])

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

  const displaySong = isEditing && editSong ? editSong : song
  const lines = useMemo(() => displaySong?.stageLyrics?.[1] ?? [], [displaySong?.stageLyrics])
  const furiganaData = displaySong?.furiganaData
  const furiganaByIndex = useMemo(
    () => new Map((furiganaData ?? []).map((fl) => [fl.lineIndex, fl])),
    [furiganaData],
  )
  const parsedLines = useMemo(() => song?.lrcParsed ?? [], [song?.lrcParsed])
  const calibrations = useMemo(() => song?.calibrations ?? {}, [song?.calibrations])
  const ignoreAllMediumHints = !!displaySong?.ignoreAllMediumConfidenceHints
  const ignoredMediumLineIndexes = useMemo(
    () => new Set(displaySong?.ignoredMediumConfidenceLineIndexes ?? []),
    [displaySong?.ignoredMediumConfidenceLineIndexes],
  )
  const hasAnyMediumConfidence = useMemo(
    () => (furiganaData ?? []).some((line) => line.words.some((word) => word.confidence === 'medium')),
    [furiganaData],
  )
  const currentLineIndex = findCurrentLine(parsedLines, currentTimeMs, calibrations)
  const currentPracticeLine = currentLineIndex >= 0 ? lines[currentLineIndex] : undefined
  const currentLineIsCredit = !!currentPracticeLine && isCreditLineText(currentPracticeLine.original)
  const currentPracticeLineId = currentLineIndex >= 0 ? `${song?.neteaseId ?? 'song'}:${currentLineIndex}` : ''
  const currentLineSaved = currentPracticeLineId ? savedLineIds.has(currentPracticeLineId) : false
  const currentLineLooping = loopLineIndex === currentLineIndex && !!loopRange
  const firstSingableLineIndex = useMemo(
    () => lines.findIndex((line) => line.original.trim() && !isCreditLineText(line.original)),
    [lines],
  )

  useEffect(() => {
    if (!song || focusLineIndex === null) return

    const signature = `${song.neteaseId}:${focusLineIndex}`
    if (handledFocusLineRef.current === signature) return

    const calibration = calibrations[focusLineIndex]
    const startMs = calibration?.startMs ?? parsedLines[focusLineIndex]?.timeMs
    if (startMs === undefined) return

    handledFocusLineRef.current = signature
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      userScrollingRef.current = false
      setLoopRange(null)
      setLoopLineIndex(null)
      setPlayRangeEnd(null)
      setPendingSeek(startMs)

      requestAnimationFrame(() => {
        lyricsRef.current?.querySelector('.lyrics-line.active')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      })
    })
    return () => { cancelled = true }
  }, [calibrations, focusLineIndex, parsedLines, setLoopRange, setPendingSeek, setPlayRangeEnd, song])

  const handleRegenerateFurigana = async () => {
    if (!song) return
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

  const jumpToLineAndPlay = useCallback((lineIndex: number) => {
    const calibration = calibrations[lineIndex]
    const startMs = calibration?.startMs ?? parsedLines[lineIndex]?.timeMs
    if (startMs === undefined) return

    setPlaying(false)
    setTimeout(() => {
      setLoopRange(null)
      setLoopLineIndex(null)
      setPlayRangeEnd(null)
      setPendingSeek(startMs)
      setPlaying(true)
    }, 50)
  }, [calibrations, parsedLines, setLoopRange, setPendingSeek, setPlayRangeEnd, setPlaying])

  const startCurrentLineLoop = useCallback((slow = false) => {
    if (currentLineIndex < 0) return

    const calibration = calibrations[currentLineIndex]
    const { start, end } = getLineWindow(parsedLines, currentLineIndex, calibration)
    if (end <= start) return
    if (slow) setPlaybackRate(0.75)
    setLoopLineIndex(currentLineIndex)
    setLoopRange({ startMs: start, endMs: end })
    setPlayRangeEnd(null)
    setPendingSeek(start)
    setPlaying(true)
  }, [
    calibrations,
    currentLineIndex,
    parsedLines,
    setLoopRange,
    setPlaybackRate,
    setPendingSeek,
    setPlayRangeEnd,
    setPlaying,
  ])

  const toggleCurrentLineLoop = useCallback(() => {
    if (currentLineIndex < 0) return
    if (loopLineIndex === currentLineIndex && loopRange) {
      setLoopRange(null)
      setLoopLineIndex(null)
      return
    }
    startCurrentLineLoop(false)
  }, [currentLineIndex, loopLineIndex, loopRange, setLoopRange, startCurrentLineLoop])

  const toggleCurrentLineSave = useCallback(async () => {
    if (!song || currentLineIndex < 0) return
    const line = lines[currentLineIndex]
    if (!line?.original.trim()) return

    const lineId = `${song.neteaseId}:${currentLineIndex}`
    const saved = await toggleSavedLine({
      id: lineId,
      neteaseId: song.neteaseId,
      songTitle: song.title,
      artist: song.artist,
      lineIndex: currentLineIndex,
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
  }, [currentLineIndex, lines, song])

  const jumpToFirstSingableLine = useCallback(() => {
    if (firstSingableLineIndex < 0) return
    jumpToLineAndPlay(firstSingableLineIndex)
  }, [firstSingableLineIndex, jumpToLineAndPlay])

  const handlePlayRequest = useCallback(() => {
    if (currentLineIsCredit && firstSingableLineIndex >= 0) {
      jumpToFirstSingableLine()
      return true
    }
    return false
  }, [currentLineIsCredit, firstSingableLineIndex, jumpToFirstSingableLine])

  const panelGradient = currentAlbumColors
    ? `linear-gradient(135deg, ${toRgba(currentAlbumColors.dark, 0.96)}, ${toRgba(darkenHex(currentAlbumColors.palette[2] ?? currentAlbumColors.dark, 0.5), 0.92)})`
    : toRgba(safePanelColor, Math.max(appearance.lyricsPanelOpacity, 0.76))

  if (!id || Number.isNaN(neteaseId)) {
    return (
      <div className="page-shell px-4 py-6">
        <p className="text-danger">无效的歌曲 ID</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-shell px-4 py-6">
        <div className="learning-panel flex flex-col items-center gap-4 px-5 py-16 text-center">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-semibold text-text">正在准备跟唱页</p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              正在加载歌词、假名和罗马音，第一次打开一首歌会稍慢一点。
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="page-shell px-4 py-6">
        <div className="learning-panel px-5 py-10 text-center">
          <p className="text-xs font-semibold uppercase text-danger">Load failed</p>
          <h2 className="mt-2 text-2xl font-bold text-text">这首歌暂时打不开</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-text-secondary">
            {getSongErrorMessage(error)}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-white"
            >
              重新加载
            </button>
            <Link
              to="/search"
              className="rounded-lg bg-surface-alt px-6 py-2.5 font-semibold text-text-secondary"
            >
              换一首歌
            </Link>
            <Link
              to="/settings"
              className="rounded-lg border border-border bg-surface px-6 py-2.5 font-semibold text-text-secondary"
            >
              去登录
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
      <div className="sticky top-0 z-10 space-y-3 rounded-b-lg border-b border-border/70 bg-surface/94 p-3 backdrop-blur-md shadow-sm">
        <SongHeader
          title={song.title}
          artist={song.artist}
          albumArtUrl={song.albumArtUrl}
          album={song.album}
        />
        <AudioPlayer
          src={audioSrc}
          onRetry={handleRetryAudio}
          isRetrying={isRetryingAudio}
          onPlayRequest={handlePlayRequest}
        />
        <SongToolbar
          showFurigana={showFurigana}
          showRomaji={showRomaji}
          showTranslation={showTranslation}
          showKTV={showKTV}
          isRegenerating={isRegenerating}
          isEditing={isEditing}
          hasAnyMediumConfidence={hasAnyMediumConfidence}
          ignoreAllMediumHints={ignoreAllMediumHints}
          regenerateFeedback={regenerateFeedback}
          onToggleFurigana={() => setShowFurigana((v) => !v)}
          onToggleRomaji={() => setShowRomaji((v) => !v)}
          onToggleTranslation={() => setShowTranslation((v) => !v)}
          onToggleKTV={() => setShowKTV((v) => !v)}
          onUseBeginnerPreset={() => {
            setShowFurigana(true)
            setShowRomaji(true)
            setShowTranslation(true)
            setShowKTV(true)
          }}
          onUseChallengePreset={() => {
            setShowFurigana(false)
            setShowRomaji(false)
            setShowTranslation(false)
            setShowKTV(true)
          }}
          onRegenerateFurigana={handleRegenerateFurigana}
          onToggleIgnoreMediumHints={async () => {
            const updated = await setIgnoreAllMediumConfidenceHints(song.neteaseId, !ignoreAllMediumHints)
            if (updated) {
              setSong(updated)
              if (isEditing) setEditSong(updated)
            }
          }}
          onToggleEditing={() => {
            setIsEditing(!isEditing)
            setEditSong(isEditing ? null : { ...song })
          }}
        />
      </div>

      {isEditing && editSong ? (
        <LyricsEditor
          song={editSong}
          calibrations={calibrations}
          onCalibrationsSave={(c) => setSong({ ...song!, calibrations: c })}
          onSongUpdate={setEditSong}
        />
      ) : (
        <div className="px-3 pt-4">
          <div className="mb-3 rounded-lg border border-border/60 bg-surface/80 px-3 py-2 text-xs text-text-secondary">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-accent">听一句，唱一句</span>
                <span className="ml-2">{getPracticeModeLabel(showFurigana, showRomaji, showTranslation)}</span>
              </div>
              <button
                type="button"
                disabled={currentLineIndex < 0 || currentLineIsCredit}
                onClick={() => startCurrentLineLoop(true)}
                className={`rounded-full px-3 py-1 font-semibold transition-colors disabled:opacity-40 ${
                  currentLineLooping && playbackRate === 0.75
                    ? 'bg-accent text-white'
                    : 'bg-highlight text-accent'
                }`}
              >
                {currentLineLooping && playbackRate === 0.75 ? '慢速循环中' : '慢速循环'}
              </button>
            </div>
            <div className="mb-2 rounded-lg bg-surface-alt/75 px-3 py-2">
              <p className="text-[11px] font-semibold text-text-muted">
                {currentLineIsCredit
                  ? '当前是歌曲信息'
                  : currentLineIndex >= 0
                    ? `当前第 ${currentLineIndex + 1} 句`
                    : '等待播放定位'}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-text">
                {currentLineIsCredit
                  ? '这几行不用跟唱，正式歌词开始后再练。'
                  : currentPracticeLine?.original || '播放歌曲后，这里会显示正在练的歌词。'}
              </p>
              {currentPracticeLine?.romaji && !currentLineIsCredit && (
                <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">{currentPracticeLine.romaji}</p>
              )}
              {currentLineIsCredit && firstSingableLineIndex >= 0 && (
                <button
                  type="button"
                  onClick={jumpToFirstSingableLine}
                  className="mt-2 rounded-full bg-accent-bg px-3 py-1 text-xs font-semibold text-accent"
                >
                  跳到第一句歌词
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentLineIndex < 0 || currentLineIsCredit}
                onClick={toggleCurrentLineLoop}
                className={`rounded-full px-3 py-1 font-semibold transition-colors disabled:opacity-40 ${
                  currentLineLooping
                    ? 'bg-accent text-white'
                    : 'bg-surface-alt text-text-secondary'
                }`}
              >
                {currentLineLooping ? '停止循环' : '循环当前句'}
              </button>
              <button
                type="button"
                disabled={currentLineIndex < 0 || currentLineIsCredit}
                onClick={() => {
                  const text = lines[currentLineIndex]?.original
                  if (text) speak(text)
                }}
                className="rounded-full bg-surface-alt px-3 py-1 font-semibold text-text-secondary transition-colors disabled:opacity-40"
              >
                读一遍
              </button>
              <button
                type="button"
                disabled={currentLineIndex < 0 || currentLineIsCredit}
                onClick={toggleCurrentLineSave}
                className={`rounded-full px-3 py-1 font-semibold transition-colors disabled:opacity-40 ${
                  currentLineSaved
                    ? 'bg-accent-bg text-accent'
                    : 'bg-surface-alt text-text-secondary'
                }`}
              >
                {currentLineSaved ? '已收藏' : '收藏这句'}
              </button>
            </div>
          </div>
          <div className="lyrics-viewport py-6 overflow-x-hidden" ref={lyricsRef}>
          {lines.map((line, i) => {
            if (!line.original.trim()) {
              return <div key={i} className="h-6" />
            }
            const fLine = furiganaByIndex.get(i)
            const isActive = i === currentLineIndex && isPlaying
            const lineProgress = isActive && showKTV
              ? getLineProgress(parsedLines, i, currentTimeMs, calibrations[i])
              : 0
            const lineId = `${song.neteaseId}:${i}`
            return (
              <LyricsLineItem
                key={i}
                song={song}
                line={line}
                index={i}
                fLine={fLine}
                lineProgress={lineProgress}
                isActive={isActive}
                isPlayed={i < currentLineIndex}
                isCreditLine={isCreditLineText(line.original)}
                lineSaved={savedLineIds.has(lineId)}
                mediumIgnored={ignoredMediumLineIndexes.has(i)}
                ignoreAllMediumHints={ignoreAllMediumHints}
                lineHint={furiganaHint?.lineIndex === i ? furiganaHint : null}
                isEditingRomaji={romajiEdit?.lineIndex === i}
                romajiEdit={romajiEdit}
                savedWordIds={savedWordIds}
                showFurigana={showFurigana}
                showRomaji={showRomaji}
                showTranslation={showTranslation}
                speakingLineIndex={speakingLineIndex}
                isPreview={isPreview}
                isEditing={isEditing}
                onJumpToLine={jumpToLineAndPlay}
                speak={speak}
                stopSpeech={stopSpeech}
                setSong={setSong}
                setEditSong={setEditSong}
                setSavedLineIds={setSavedLineIds}
                setSavedWordIds={setSavedWordIds}
                setFuriganaHint={setFuriganaHint}
                setRomajiEdit={setRomajiEdit}
                setSpeakingLineIndex={setSpeakingLineIndex}
              />
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}

function getPracticeModeLabel(showFurigana: boolean, showRomaji: boolean, showTranslation: boolean): string {
  if (showFurigana && showRomaji && showTranslation) return '新手模式'
  if (!showFurigana && !showRomaji && !showTranslation) return '挑战模式'
  if (showFurigana || showRomaji) return '读音辅助开启'
  return '裸读歌词'
}

function getSongErrorMessage(error: string | null): string {
  if (!error) return '可能是网络、歌词源或本地缓存暂时异常。'
  if (error.includes('没有找到歌词')) {
    return '这首歌没有可用歌词。可以换一个版本，或先找另一首歌练。'
  }
  if (error.includes('Failed') || error.includes('network') || error.includes('fetch')) {
    return '网络请求失败。可以先重试；如果需要播放受限歌曲，去设置页登录音乐账号。'
  }
  return error
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
