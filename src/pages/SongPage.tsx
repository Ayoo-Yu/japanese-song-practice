import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAnnotatedSong } from '../hooks/useAnnotatedSong'
import { SongHeader } from '../components/song/SongHeader'
import { AudioPlayer } from '../components/song/AudioPlayer'
import { LyricsEditor } from '../components/song/LyricsEditor'
import { usePlayerStore } from '../stores/player-store'
import { ensureAudioUrl } from '../services/lyrics-service'
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

  useEffect(() => {
    if (song) {
      ensureAudioUrl(song).then((s) => setAudioUrl(s.audioUrl))
    }
  }, [song])

  // Detect user scroll on the page
  useEffect(() => {
    const onUserScroll = () => {
      userScrollingRef.current = true
      clearTimeout(scrollTimerRef.current)
      scrollTimerRef.current = setTimeout(() => {
        userScrollingRef.current = false
      }, 10000)
    }
    window.addEventListener('wheel', onUserScroll, { passive: true })
    window.addEventListener('touchmove', onUserScroll, { passive: true })
    return () => {
      window.removeEventListener('wheel', onUserScroll)
      window.removeEventListener('touchmove', onUserScroll)
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
    const el = document.querySelector('.lyrics-line.active')
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

  return (
    <div className="max-w-lg mx-auto pb-8">
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
        <div className="py-2" ref={lyricsRef}>
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

            return (
              <div
                key={i}
                className={`lyrics-line px-4 py-1.5 transition-colors duration-300 ${
                  isActive ? 'active' : ''
                }`}
              >
                <KTVLine progress={lineProgress}>
                  {hasFurigana ? (
                    <FuriganaText tokens={fLine.words} showFurigana={showFurigana} />
                  ) : (
                    <div className="text-line">{line.original}</div>
                  )}
                </KTVLine>
                {showRomaji && line.romaji && (
                  <div className="romaji">{line.romaji}</div>
                )}
                {showTranslation && line.translation && (
                  <div className="translation">{line.translation}</div>
                )}
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

function FuriganaText({ tokens, showFurigana }: { tokens: FuriganaToken[]; showFurigana: boolean }) {
  return (
    <div className="text-line">
      {tokens.map((token, i) => {
        if (token.isKanji && token.reading) {
          if (showFurigana) {
            return (
              <ruby key={i}>{token.surface}<rp>(</rp><rt>{token.reading}</rt><rp>)</rp></ruby>
            )
          }
          return <span key={i}>{token.surface}</span>
        }
        return <span key={i}>{token.surface}</span>
      })}
    </div>
  )
}

function getLineProgress(
  lines: { timeMs: number }[],
  lineIndex: number,
  currentTimeMs: number,
  calibration?: { startMs: number; endMs: number },
): number {
  const { start, end } = getLineWindow(lines, lineIndex, calibration)
  if (end <= start) return currentTimeMs >= start ? 1 : 0
  const offset = calibration ? 0 : 300
  return Math.max(0, Math.min(1, (currentTimeMs + offset - start) / (end - start)))
}

function findCurrentLine(
  lines: { timeMs: number }[],
  currentTimeMs: number,
  calibrations: Record<number, { startMs: number; endMs: number }>,
): number {
  if (lines.length === 0) return -1
  for (let i = 0; i < lines.length; i++) {
    const { start, end } = getLineWindow(lines, i, calibrations[i])
    if (currentTimeMs < start) {
      return i === 0 ? -1 : i - 1
    }
    if (currentTimeMs < end || i === lines.length - 1) {
      return i
    }
  }
  return lines.length - 1
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
