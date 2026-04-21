import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAnnotatedSong } from '../hooks/useAnnotatedSong'
import { SongHeader } from '../components/song/SongHeader'
import { AudioPlayer } from '../components/song/AudioPlayer'
import { LyricsEditor } from '../components/song/LyricsEditor'
import { usePlayerStore } from '../stores/player-store'
import { useUIStore } from '../stores/ui-store'
import { ensureAudioUrl } from '../services/lyrics-service'
import { regenerateFurigana } from '../services/song-service'
import { listSavedLines, listSavedWords, toggleSavedLine, toggleSavedWord } from '../services/collections-service'
import type { Song, FuriganaToken } from '../types'

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
  const _vocalEnergy = usePlayerStore((s) => s.vocalEnergy)
  void _vocalEnergy
  const [audioUrl, setAudioUrl] = useState<string | undefined>()
  const [isEditing, setIsEditing] = useState(false)
  const [editSong, setEditSong] = useState<Song | null>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const userScrollingRef = useRef(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const prevLineRef = useRef(-1)

  const [showFurigana, setShowFurigana] = useState(true)
  const [showRomaji, setShowRomaji] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)
  const [showKTV, setShowKTV] = useState(true)
  const [savedWordIds, setSavedWordIds] = useState<Set<string>>(new Set())
  const [savedLineIds, setSavedLineIds] = useState<Set<string>>(new Set())
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [furiganaHint, setFuriganaHint] = useState<FuriganaHint | null>(null)
  const appearance = useUIStore((s) => s.appearance)

  useEffect(() => {
    if (song) {
      ensureAudioUrl(song).then((s) => setAudioUrl(s.audioUrl))
    }
  }, [song])

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

  if (!id || Number.isNaN(neteaseId)) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-danger">无效的歌曲 ID</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-4 py-20">
          <div className="w-10 h-10 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">加载歌词...</p>
        </div>
      </div>
    )
  }

  if (error || !song) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <p className="text-danger">{error ?? '加载失败'}</p>
      </div>
    )
  }

  const displaySong = isEditing && editSong ? editSong : song
  const lines = displaySong.stageLyrics?.[1] ?? []
  const furiganaData = displaySong.furiganaData ?? []
  const furiganaByIndex = new Map(furiganaData.map((fl) => [fl.lineIndex, fl]))
  const parsedLines = song.lrcParsed ?? []
  const calibrations = song.calibrations ?? {}
  const currentLineIndex = findCurrentLine(parsedLines, currentTimeMs, calibrations)

  const handleRegenerateFurigana = async () => {
    setIsRegenerating(true)
    try {
      const updated = await regenerateFurigana(song.neteaseId)
      if (updated) {
        setSong(updated)
        if (isEditing) setEditSong(updated)
      }
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div
      className="max-w-lg mx-auto pb-8 overflow-x-hidden"
      style={{
        ['--lyrics-panel-bg' as string]: toRgba(appearance.lyricsPanelColor, appearance.lyricsPanelOpacity),
        ['--lyrics-line-base-bg' as string]: toRgba(appearance.lyricsTextColor, appearance.lyricsLineOpacity),
        ['--lyrics-primary-color' as string]: appearance.lyricsTextColor,
        ['--lyrics-accent-color' as string]: appearance.lyricsAccentColor,
        ['--lyrics-furigana-color' as string]: appearance.lyricsAccentColor,
        ['--ktv-highlight-color' as string]: appearance.lyricsAccentColor,
        ['--lyrics-active-bg' as string]: toRgba(appearance.lyricsAccentColor, 0.14),
        ['--lyrics-secondary-color' as string]: appearance.lyricsSubtextColor,
        ['--lyrics-muted-color' as string]: appearance.lyricsSubtextColor,
      }}
    >
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm p-4 space-y-3">
        <SongHeader
          title={song.title}
          artist={song.artist}
          albumArtUrl={song.albumArtUrl}
          album={song.album}
        />
        <AudioPlayer src={audioUrl} />
        <div className="flex items-center gap-2 flex-wrap">
          <TogglePill active={showFurigana} onClick={() => setShowFurigana((v) => !v)}>
            平假名
          </TogglePill>
          <TogglePill active={showRomaji} onClick={() => setShowRomaji((v) => !v)}>
            罗马音
          </TogglePill>
          <TogglePill active={showTranslation} onClick={() => setShowTranslation((v) => !v)}>
            翻译
          </TogglePill>
          <TogglePill active={showKTV} onClick={() => setShowKTV((v) => !v)}>
            渐变
          </TogglePill>
          <button
            onClick={handleRegenerateFurigana}
            disabled={isRegenerating}
            className="px-3 py-1 rounded-full text-xs font-medium bg-surface-alt text-text-secondary border border-border hover:border-accent disabled:opacity-60"
          >
            {isRegenerating ? '重建中...' : '重生成注音'}
          </button>
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
            const lineProgress = isPlaying && showKTV
              ? getLineProgress(parsedLines, i, currentTimeMs, calibrations[i])
              : 0
            const isActive = i === currentLineIndex && isPlaying

            const lineId = `${song.neteaseId}:${i}`
            const lineSaved = savedLineIds.has(lineId)
            const lineHasLowConfidence = !!fLine?.words.some((word) => word.confidence === 'low')
            const lineHasMediumConfidence = !!fLine?.words.some((word) => word.confidence === 'medium')
            const lineHint = furiganaHint?.lineIndex === i ? furiganaHint : null

            return (
              <div
                key={i}
                className={`lyrics-line relative px-4 py-1.5 ${
                  isActive ? 'active' : ''
                }`}
              >
                <div className="lyrics-line-base" />
                <div className={`lyrics-line-bg ${isActive ? 'active' : ''}`} />
                <button
                  onClick={async () => {
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
                  className={`absolute right-2 top-2 z-20 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    lineSaved
                      ? 'bg-accent/18 text-accent'
                      : 'bg-black/20 text-white/85 hover:bg-black/28'
                  }`}
                >
                  {lineSaved ? '已收藏' : '收藏句子'}
                </button>
                <div className="relative z-10">
                  <KTVLine progress={lineProgress}>
                  {hasFurigana ? (
                      <FuriganaText
                        tokens={fLine.words}
                        showFurigana={showFurigana}
                        savedWordIds={savedWordIds}
                        onWordToggle={async (token) => {
                          const wordId = `${song.neteaseId}:${i}:${token.surface}:${token.reading}`
                          const saved = await toggleSavedWord({
                            id: wordId,
                            neteaseId: song.neteaseId,
                            songTitle: song.title,
                            artist: song.artist,
                            lineIndex: i,
                            lineText: line.original,
                            surface: token.surface,
                            reading: token.reading,
                          })
                          setSavedWordIds((prev) => {
                            const next = new Set(prev)
                            if (saved) next.add(wordId)
                            else next.delete(wordId)
                            return next
                          })
                          if (token.confidence === 'low' || token.confidence === 'medium') {
                            setFuriganaHint({
                              lineIndex: i,
                              surface: token.surface,
                              reading: token.reading,
                              confidence: token.confidence,
                              source: token.source,
                              saved,
                            })
                          } else {
                            setFuriganaHint(null)
                          }
                          return saved
                        }}
                        wordIdForToken={(token) => `${song.neteaseId}:${i}:${token.surface}:${token.reading}`}
                      />
                  ) : (
                    <div className="text-line">{line.original}</div>
                  )}
                  </KTVLine>
                  {(lineHasLowConfidence || lineHasMediumConfidence) && (
                    <div className={`mt-1 text-[11px] ${
                      lineHasLowConfidence ? 'text-warning' : 'text-text-muted'
                    }`}>
                      {lineHasLowConfidence ? '这句里有低置信度注音，点具体单词可查看原因并顺手收藏。' : '这句里有中等置信度注音，点具体单词可查看来源。'}
                    </div>
                  )}
                  {lineHint && (
                    <div className={`mt-2 rounded-lg border px-3 py-2 text-left text-xs ${
                      lineHint.confidence === 'low'
                        ? 'border-warning/40 bg-warning/10 text-text'
                        : 'border-accent/25 bg-accent/8 text-text'
                    }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-text">
                            {lineHint.surface}
                            <span className="ml-2 text-text-secondary">{lineHint.reading}</span>
                          </p>
                          <p className="mt-1 text-text-secondary">
                            {getConfidenceDescription(lineHint)}
                          </p>
                          <p className="mt-1 text-text-muted">
                            {lineHint.saved ? '已加入生词本，后面可以在曲库页继续整理。' : '还没有加入生词本，再点一次这个词可以取消收藏。'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFuriganaHint(null)}
                          className="shrink-0 rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-black/5"
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  )}
                  {showRomaji && line.romaji && (
                    <div className="romaji">{line.romaji}</div>
                  )}
                  {showTranslation && line.translation && (
                    <div className="translation">{line.translation}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TogglePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
        active
          ? 'bg-accent/15 text-accent border border-accent/30'
          : 'bg-surface-alt text-text-muted border border-transparent hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
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
  showFurigana,
  savedWordIds,
  onWordToggle,
  wordIdForToken,
}: {
  tokens: FuriganaToken[]
  showFurigana: boolean
  savedWordIds: Set<string>
  onWordToggle: (token: FuriganaToken) => boolean | Promise<boolean>
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
          if (showFurigana) {
            return (
              <button
                key={i}
                type="button"
                title={token.confidence === 'low' ? '注音可信度较低' : token.confidence === 'medium' ? '注音可信度中等' : '收藏这个单词'}
                onClick={() => void onWordToggle(token)}
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
            title={token.confidence === 'low' ? '注音可信度较低' : token.confidence === 'medium' ? '注音可信度中等' : '收藏这个单词'}
            onClick={() => void onWordToggle(token)}
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
  surface: string
  reading: string
  confidence: 'medium' | 'low'
  source?: FuriganaToken['source']
  saved: boolean
}

function getConfidenceDescription(hint: FuriganaHint): string {
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
