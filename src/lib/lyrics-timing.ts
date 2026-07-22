export interface TimedLyricsLine {
  timeMs: number
}

export interface LyricsCalibration {
  startMs: number
  endMs: number
}

export const MAX_LYRICS_OFFSET_MS = 5000

export function clampLyricsOffsetMs(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(-MAX_LYRICS_OFFSET_MS, Math.min(MAX_LYRICS_OFFSET_MS, Math.round(value)))
}

export function getLineStartMs(
  lines: TimedLyricsLine[],
  lineIndex: number,
  calibration?: LyricsCalibration,
  lyricsOffsetMs = 0,
): number | undefined {
  const line = lines[lineIndex]
  if (!line) return undefined
  return calibration?.startMs ?? line.timeMs + clampLyricsOffsetMs(lyricsOffsetMs)
}

export function getLineWindow(
  lines: TimedLyricsLine[],
  lineIndex: number,
  calibration?: LyricsCalibration,
  lyricsOffsetMs = 0,
): { start: number; end: number } {
  const start = getLineStartMs(lines, lineIndex, calibration, lyricsOffsetMs) ?? 0
  const offset = clampLyricsOffsetMs(lyricsOffsetMs)
  const fallbackEnd = lineIndex + 1 < lines.length
    ? lines[lineIndex + 1].timeMs + offset
    : start + 5000
  const end = calibration?.endMs ?? fallbackEnd
  return { start, end: Math.max(end, start) }
}

export function findCurrentLine(
  lines: TimedLyricsLine[],
  currentTimeMs: number,
  calibrations: Record<number, LyricsCalibration>,
  lyricsOffsetMs = 0,
): number {
  if (lines.length === 0) return -1

  let currentLineIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const start = getLineStartMs(lines, i, calibrations[i], lyricsOffsetMs)
    if (start === undefined || currentTimeMs < start) break
    currentLineIndex = i
  }
  return currentLineIndex
}

export function getLineProgress(
  lines: TimedLyricsLine[],
  lineIndex: number,
  currentTimeMs: number,
  calibration?: LyricsCalibration,
  lyricsOffsetMs = 0,
): number {
  const { start, end } = getLineWindow(lines, lineIndex, calibration, lyricsOffsetMs)
  if (end <= start) return currentTimeMs >= start ? 1 : 0
  return Math.max(0, Math.min(1, (currentTimeMs - start) / (end - start)))
}
