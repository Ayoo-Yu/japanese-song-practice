import { useState, useCallback } from 'react'
import { updateLyrics, saveCalibrations } from '../../services/song-service'
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
  const [isSaving, setIsSaving] = useState(false)
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

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const changes = lines.map((l) => ({
        timeMs: l.timeMs,
        original: l.original !== (parsedLines.find((p) => p.timeMs === l.timeMs)?.text) ? l.original : undefined,
        romaji: l.romaji !== (romajiLines[l.timeMs] ?? '') ? l.romaji : undefined,
        translation: l.translation !== (translationLines[l.timeMs] ?? '') ? l.translation : undefined,
      })).filter((c) => c.original !== undefined || c.romaji !== undefined || c.translation !== undefined)

      if (changes.length > 0) {
        const updated = await updateLyrics(song.neteaseId, changes)
        if (updated) onSongUpdate(updated)
      }

      if (hasCalibrationChanges) {
        const updated = await saveCalibrations(song.neteaseId, localCalibrations)
        if (updated) onSongUpdate(updated)
        onCalibrationsSave(localCalibrations)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = lines.some((l, i) => {
    const orig = parsedLines[i]
    return (
      l.original !== (orig?.text ?? '') ||
      l.romaji !== (romajiLines[l.timeMs] ?? '') ||
      l.translation !== (translationLines[l.timeMs] ?? '')
    )
  })

  const hasCalibrationChanges =
    JSON.stringify(localCalibrations) !== JSON.stringify(calibrations)

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

  const previewCalibration = (lineIdx: number) => {
    const cal = localCalibrations[lineIdx]
    if (!cal) return
    setPlaying(false)
    setTimeout(() => {
      setPlayRangeEnd(cal.endMs)
      setPendingSeek(cal.startMs)
    }, 50)
  }

  const resetCalibration = (lineIdx: number) => {
    const next = { ...localCalibrations }
    delete next[lineIdx]
    setLocalCalibrations(next)
  }

  return (
    <div className={`px-4 py-2 space-y-1 ${(hasChanges || hasCalibrationChanges) ? 'pb-20' : ''}`}>
      {lines.map((line, i) => {
        if (!line.original.trim() && !line.romaji && !line.translation) {
          return <div key={i} className="h-4" />
        }
        const isCalibrated = localCalibrations[i] !== undefined
        const isCalibrating = calibratingLine === i

        return (
          <div key={i} className="py-2 border-b border-border/30 space-y-1">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={line.original}
                  onChange={(e) => updateLine(i, 'original', e.target.value)}
                  className="w-full bg-transparent text-text text-base font-medium outline-none border-b border-transparent focus:border-accent/50 px-1 py-0.5"
                  placeholder="原文"
                />
                <input
                  type="text"
                  value={line.romaji}
                  onChange={(e) => updateLine(i, 'romaji', e.target.value)}
                  className="w-full bg-transparent text-text-secondary text-sm outline-none border-b border-transparent focus:border-accent/50 px-1 py-0.5"
                  placeholder="罗马音"
                />
                <input
                  type="text"
                  value={line.translation}
                  onChange={(e) => updateLine(i, 'translation', e.target.value)}
                  className="w-full bg-transparent text-text-muted text-sm outline-none border-b border-transparent focus:border-accent/50 px-1 py-0.5"
                  placeholder="翻译"
                />
              </div>
              <button
                onClick={() => isCalibrating ? setCalibratingLine(null) : openCalibration(i)}
                className={`mt-1 px-2 py-1 rounded text-xs font-medium shrink-0 transition-colors ${
                  isCalibrated
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-alt text-text-muted hover:text-text-secondary'
                }`}
              >
                {isCalibrated ? '已校准' : '校准'}
              </button>
            </div>

            {isCalibrating && localCalibrations[i] && (
              <CalibrationPanel
                lineIdx={i}
                calibration={localCalibrations[i]}
                onUpdate={updateCalibration}
                onPreview={previewCalibration}
                onReset={resetCalibration}
              />
            )}
          </div>
        )
      })}

      {(hasChanges || hasCalibrationChanges) && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: 'rgba(0,0,0,0.85)', zIndex: 9999 }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{ width: '100%', padding: '12px', background: '#e11d48', color: 'white', fontWeight: 'bold', fontSize: 16, borderRadius: 12 }}
          >
            {isSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      )}
    </div>
  )
}

function CalibrationPanel({
  lineIdx,
  calibration,
  onUpdate,
  onPreview,
  onReset,
}: {
  lineIdx: number
  calibration: { startMs: number; endMs: number }
  onUpdate: (idx: number, field: 'startMs' | 'endMs', value: number) => void
  onPreview: (idx: number) => void
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
          className="px-3 py-1 rounded-md bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 transition-colors"
        >
          试听
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
