import { useState, useCallback } from 'react'
import { updateLyrics } from '../../services/song-service'
import type { Song } from '../../types'

interface LyricsEditorProps {
  song: Song
  onSongUpdate: (song: Song) => void
}

interface LineEdit {
  timeMs: number
  original: string
  romaji: string
  translation: string
}

export function LyricsEditor({ song, onSongUpdate }: LyricsEditorProps) {
  const parsedLines = song.lrcParsed ?? []
  const romajiLines = song.romajiLines ?? {}
  const translationLines = song.translationLines ?? {}

  const [lines, setLines] = useState<LineEdit[]>(
    parsedLines.map((l) => ({
      timeMs: l.timeMs,
      original: l.text,
      romaji: romajiLines[l.timeMs] ?? '',
      translation: translationLines[l.timeMs] ?? '',
    }))
  )
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <div className="px-4 py-2 space-y-1">
      {lines.map((line, i) => {
        if (!line.original.trim() && !line.romaji && !line.translation) {
          return <div key={i} className="h-4" />
        }
        return (
          <div key={i} className="py-2 border-b border-border/30 space-y-1">
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
        )
      })}

      {hasChanges && (
        <div className="sticky bottom-4 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium text-base active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isSaving ? '保存中...' : '保存修改'}
          </button>
        </div>
      )}
    </div>
  )
}
