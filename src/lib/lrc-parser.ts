import type { ParsedLine } from '../types'

const LRC_REGEX = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/

export function parseLrc(lrcRaw: string): ParsedLine[] {
  const lines = lrcRaw.split('\n')
  const parsed: ParsedLine[] = []

  for (const line of lines) {
    const match = line.match(LRC_REGEX)
    if (!match) continue

    const minutes = parseInt(match[1], 10)
    const seconds = parseInt(match[2], 10)
    const ms = match[3].length === 2 ? parseInt(match[3], 10) * 10 : parseInt(match[3], 10)
    const text = match[4].trim()

    if (!text) continue

    parsed.push({
      timeMs: minutes * 60_000 + seconds * 1_000 + ms,
      text,
      index: parsed.length,
    })
  }

  return parsed
}
