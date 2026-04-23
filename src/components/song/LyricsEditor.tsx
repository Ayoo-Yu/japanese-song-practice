import { useState, useCallback } from 'react'
import { ensureSongPersisted, updateLyrics, saveCalibrations } from '../../services/song-service'
import { usePlayerStore } from '../../stores/player-store'
import type { Song } from '../../types'

interface LyricsEditorProps {
  song: Song
  calibrations: Record<number, { startMs: number; endMs: number }>
  onCalibrationsSave: (c: Record<number, { startMs: number; endMs: number }>) => void
  onSongUpdate: (song: Song) => void
}

interface LineEdit {
  timeMs: number
  original: string
  romaji: string
  translation: string
}

export function LyricsEditor({ song, calibrations, onCalibrationsSave, onSongUpdate }: LyricsEditorProps) {
  const parsedLines = song.lrcParsed ?? []
  const romajiLines = song.romajiLines ?? {}
  const translationLines = song.translationLines ?? {}

  const [localCalibrations, setLocalCalibrations] = useState(calibrations)

  const [lines, setLines] = useState<LineEdit[]>(
    parsedLines.map((l) => ({
      timeMs: l.timeMs,
      original: l.text,
      romaji: romajiLines[l.timeMs] ?? '',
      translation: translationLines[l.timeMs] ?? '',
    }))
  )
  const [previewSavingLine, setPreviewSavingLine] = useState<number | null>(null)
  const [autoSavingLine, setAutoSavingLine] = useState<number | null>(null)
  const [calibratingLine, setCalibratingLine] = useState<number | null>(null)

  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const setPlayRangeEnd = usePlayerStore((s) => s.setPlayRangeEnd)
  const setPlaying = usePlayerStore((s) => s.setPlaying)

  const updateLine = useCallback((idx: number, field: keyof LineEdit, value: string) => {
    setLines((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }, [])

  const persistLineIfChanged = useCallback(async (lineIdx: number) => {
    const line = lines[lineIdx]
    const originalLine = parsedLines[lineIdx]
    if (!line || !originalLine) return

    const change = {
      timeMs: line.timeMs,
      original: line.original !== (originalLine.text ?? '') ? line.original : undefined,
      romaji: line.romaji !== (romajiLines[line.timeMs] ?? '') ? line.romaji : undefined,
      translation: line.translation !== (translationLines[line.timeMs] ?? '') ? line.translation : undefined,
    }

    if (change.original === undefined && change.romaji === undefined && change.translation === undefined) {
      return
    }

    setAutoSavingLine(lineIdx)
    try {
      const persistedSong = await ensureSongPersisted(song)
      if (persistedSong.id !== song.id) {
        onSongUpdate(persistedSong)
      }
      const updated = await updateLyrics(persistedSong.neteaseId, [change])
      if (updated) onSongUpdate(updated)
    } finally {
      setAutoSavingLine((current) => (current === lineIdx ? null : current))
    }
  }, [lines, onSongUpdate, parsedLines, romajiLines, song, translationLines])

  const openCalibration = (lineIdx: number) => {
    const line = parsedLines[lineIdx]
    const nextLine = parsedLines[lineIdx + 1]
    if (!localCalibrations[lineIdx]) {
      setLocalCalibrations({
        ...localCalibrations,
        [lineIdx]: {
          startMs: line.timeMs,
          endMs: nextLine ? nextLine.timeMs : line.timeMs + 5000,
        },
      })
    }
    setCalibratingLine(lineIdx)
  }

  const updateCalibration = (lineIdx: number, field: 'startMs' | 'endMs', value: number) => {
    setLocalCalibrations({
      ...localCalibrations,
      [lineIdx]: { ...localCalibrations[lineIdx], [field]: value },
    })
  }

  const previewCalibration = async (lineIdx: number) => {
    const cal = localCalibrations[lineIdx]
    if (!cal) return

    setPreviewSavingLine(lineIdx)
    try {
      const persistedSong = await ensureSongPersisted(song)
      if (persistedSong.id !== song.id) {
        onSongUpdate(persistedSong)
      }

      const updated = await saveCalibrations(persistedSong.neteaseId, localCalibrations)
      if (updated) {
        onSongUpdate(updated)
      }
      onCalibrationsSave(localCalibrations)
    } finally {
      setPreviewSavingLine(null)
    }

    setPlaying(false)
    setTimeout(() => {
      setPlayRangeEnd(cal.endMs)
      setPendingSeek(cal.startMs)
    }, 50)
  }

  const jumpToLineAndPlay = (lineIdx: number) => {
    const cal = localCalibrations[lineIdx]
    const line = parsedLines[lineIdx]
    const startMs = cal?.startMs ?? line?.timeMs
    if (startMs === undefined) return

    setPlaying(false)
    setTimeout(() => {
      setPlayRangeEnd(null)
      setPendingSeek(startMs)
      setPlaying(true)
    }, 50)
  }

  const resetCalibration = (lineIdx: number) => {
    const next = { ...localCalibrations }
    delete next[lineIdx]
    setLocalCalibrations(next)
  }

  return (
    <div className="rounded-2xl bg-surface/88 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
      <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.original.trim() && !line.romaji && !line.translation) {
          return <div key={i} className="h-4" />
        }
        const isCalibrated = localCalibrations[i] !== undefined
        const isCalibrating = calibratingLine === i

        return (
          <div key={i} className="rounded-xl border border-border/60 bg-surface-alt/88 px-3 py-3 shadow-sm space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={line.original}
                  onChange={(e) => updateLine(i, 'original', e.target.value)}
                  onBlur={() => void persistLineIfChanged(i)}
                  className="w-full rounded-lg border border-transparent bg-surface px-3 py-2 text-base font-medium text-text outline-none focus:border-accent/50"
                  placeholder="原文"
                />
                <input
                  type="text"
                  value={line.romaji}
                  onChange={(e) => updateLine(i, 'romaji', e.target.value)}
                  onBlur={() => void persistLineIfChanged(i)}
                  className="w-full rounded-lg border border-transparent bg-surface px-3 py-2 text-sm text-text-secondary outline-none focus:border-accent/50"
                  placeholder="罗马音"
                />
                <input
                  type="text"
                  value={line.translation}
                  onChange={(e) => updateLine(i, 'translation', e.target.value)}
                  onBlur={() => void persistLineIfChanged(i)}
                  className="w-full rounded-lg border border-transparent bg-surface px-3 py-2 text-sm text-text-muted outline-none focus:border-accent/50"
                  placeholder="翻译"
                />
                {autoSavingLine === i && (
                  <div className="px-1 text-[11px] text-text-secondary">正在自动保存这句修改...</div>
                )}
              </div>
              <div className="mt-1 flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  onClick={() => jumpToLineAndPlay(i)}
                  className="rounded-md bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary ring-1 ring-border hover:bg-surface-muted"
                >
                  跳转播放
                </button>
                <button
                  onClick={() => isCalibrating ? setCalibratingLine(null) : openCalibration(i)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    isCalibrated
                      ? 'bg-accent/15 text-accent'
                      : 'bg-surface text-text-muted ring-1 ring-border hover:text-text-secondary'
                  }`}
                >
                  {isCalibrated ? '已校准' : '校准'}
                </button>
              </div>
            </div>

            {isCalibrating && localCalibrations[i] && (
              <CalibrationPanel
                lineIdx={i}
                calibration={localCalibrations[i]}
                onUpdate={updateCalibration}
                onPreview={previewCalibration}
                previewSaving={previewSavingLine === i}
                onReset={resetCalibration}
              />
            )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

function CalibrationPanel({
  lineIdx,
  calibration,
  onUpdate,
  onPreview,
  previewSaving,
  onReset,
}: {
  lineIdx: number
  calibration: { startMs: number; endMs: number }
  onUpdate: (idx: number, field: 'startMs' | 'endMs', value: number) => void
  onPreview: (idx: number) => void | Promise<void>
  previewSaving: boolean
  onReset: (idx: number) => void
}) {
  return (
    <div className="bg-surface-alt rounded-lg p-3 space-y-2 mt-1">
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1">
          <span className="text-text-muted">开始</span>
          <button onClick={() => onUpdate(lineIdx, 'startMs', calibration.startMs - 100)}
            className="w-6 h-6 rounded bg-surface-muted text-text-secondary font-bold flex items-center justify-center hover:bg-surface-muted/70 active:scale-90 transition-transform">-</button>
          <input
            type="text"
            value={formatMsInput(calibration.startMs)}
            onChange={(e) => {
              const ms = parseMsInput(e.target.value)
              if (ms !== null) onUpdate(lineIdx, 'startMs', ms)
            }}
            className="w-16 bg-white rounded px-2 py-1 text-text tabular-nums outline-none border border-border focus:border-accent/50 text-center"
            placeholder="0:00.0"
          />
          <button onClick={() => onUpdate(lineIdx, 'startMs', calibration.startMs + 100)}
            className="w-6 h-6 rounded bg-surface-muted text-text-secondary font-bold flex items-center justify-center hover:bg-surface-muted/70 active:scale-90 transition-transform">+</button>
        </label>
        <label className="flex items-center gap-1">
          <span className="text-text-muted">结束</span>
          <button onClick={() => onUpdate(lineIdx, 'endMs', calibration.endMs - 100)}
            className="w-6 h-6 rounded bg-surface-muted text-text-secondary font-bold flex items-center justify-center hover:bg-surface-muted/70 active:scale-90 transition-transform">-</button>
          <input
            type="text"
            value={formatMsInput(calibration.endMs)}
            onChange={(e) => {
              const ms = parseMsInput(e.target.value)
              if (ms !== null) onUpdate(lineIdx, 'endMs', ms)
            }}
            className="w-16 bg-white rounded px-2 py-1 text-text tabular-nums outline-none border border-border focus:border-accent/50 text-center"
            placeholder="0:00.0"
          />
          <button onClick={() => onUpdate(lineIdx, 'endMs', calibration.endMs + 100)}
            className="w-6 h-6 rounded bg-surface-muted text-text-secondary font-bold flex items-center justify-center hover:bg-surface-muted/70 active:scale-90 transition-transform">+</button>
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPreview(lineIdx)}
          disabled={previewSaving}
          className="px-3 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          {previewSaving ? '保存中...' : '试听并保存'}
        </button>
        <button
          onClick={() => onReset(lineIdx)}
          className="px-3 py-1 rounded-md bg-surface-muted text-text-muted text-xs font-medium hover:text-text-secondary transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  )
}

function formatMsInput(ms: number): string {
  const totalSec = ms / 1000
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

function parseMsInput(value: string): number | null {
  const match = value.match(/^(\d+):(\d+(?:\.\d+)?)$/)
  if (!match) return null
  const m = parseInt(match[1], 10)
  const s = parseFloat(match[2])
  return (m * 60 + s) * 1000
}
