import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAnnotatedSong } from '../hooks/useAnnotatedSong'
import { SongHeader } from '../components/song/SongHeader'
import { StageSelector } from '../components/song/StageSelector'
import { AudioPlayer } from '../components/song/AudioPlayer'
import { LyricsEditor } from '../components/song/LyricsEditor'
import { usePlayerStore } from '../stores/player-store'
import { ensureAudioUrl } from '../services/lyrics-service'
import { filterByStage } from '../lib/furigana'
import type { PracticeStage, FuriganaToken } from '../types'

export function SongPage() {
  const { id } = useParams<{ id: string }>()
  const neteaseId = id ? parseInt(id, 10) : null
  const { song, isLoading, error } = useAnnotatedSong(
    Number.isNaN(neteaseId) ? null : neteaseId
  )
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [stage, setStage] = useState<PracticeStage>(1)
  const [audioUrl, setAudioUrl] = useState<string | undefined>()
  const [isEditing, setIsEditing] = useState(false)
  const [editSong, setEditSong] = useState<typeof song>(null)
  const lyricsRef = useRef<HTMLDivElement>(null)
  const userScrollingRef = useRef(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const handleLyricsScroll = useCallback(() => {
    userScrollingRef.current = true
    clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false
    }, 3000)
  }, [])

  useEffect(() => {
    if (song) {
      ensureAudioUrl(song).then((s) => setAudioUrl(s.audioUrl))
    }
  }, [song])

  useEffect(() => {
    if (!isPlaying || !lyricsRef.current || userScrollingRef.current) return
    const active = lyricsRef.current.querySelector('.lyrics-line.active')
    if (active) {
      active.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentTimeMs, isPlaying])

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
  const lines = displaySong.stageLyrics?.[stage] ?? []
  const furiganaData = displaySong.furiganaData ?? []
  const furiganaByIndex = new Map(furiganaData.map((fl) => [fl.lineIndex, fl]))
  const currentLineIndex = findCurrentLine(song.lrcParsed ?? [], currentTimeMs)

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
        <div className="flex items-center gap-2">
          <StageSelector currentStage={stage} onStageChange={setStage} />
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
          onSongUpdate={setEditSong}
        />
      ) : (
        <div className={`py-2 ${stage === 5 ? 'ktv-mode' : ''}`} ref={lyricsRef} onScroll={handleLyricsScroll} onTouchMove={handleLyricsScroll}>
          {lines.map((line, i) => {
            if (!line.original.trim()) {
              return <div key={i} className="h-6" />
            }
            const isActive = i === currentLineIndex && isPlaying
            const fLine = furiganaByIndex.get(i)
            const hasFurigana = fLine && fLine.words.some((w) => w.isKanji)

            return (
              <div
                key={i}
                className={`lyrics-line px-4 py-1.5 transition-colors duration-300 ${
                  isActive ? 'active' : ''
                }`}
              >
                {hasFurigana ? (
                  <FuriganaText
                    tokens={fLine.words}
                    stage={stage}
                  />
                ) : (
                  <div className="text-line">{line.original}</div>
                )}
                {line.romaji && (
                  <div className="romaji">{line.romaji}</div>
                )}
                {line.translation && (
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

function FuriganaText({ tokens, stage }: { tokens: FuriganaToken[]; stage: PracticeStage }) {
  const filtered = filterByStage(tokens, stage)
  return (
    <div className="text-line">
      {filtered.map((token, i) => {
        if (token.isKanji && token.reading) {
          return (
            <ruby key={i}>
              {token.surface}
              <rp>(</rp>
              <rt>{token.reading}</rt>
              <rp>)</rp>
            </ruby>
          )
        }
        return <span key={i}>{token.surface}</span>
      })}
    </div>
  )
}

function findCurrentLine(
  lines: { timeMs: number }[],
  currentTimeMs: number,
): number {
  if (lines.length === 0) return -1
  let low = 0
  let high = lines.length - 1
  let result = -1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (lines[mid].timeMs <= currentTimeMs) {
      result = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return result
}
