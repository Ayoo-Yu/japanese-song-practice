import type { FuriganaToken, PracticeStage } from '../types'

const RUBY_REGEX = /<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/g

export function parseFuriganaHtml(html: string): FuriganaToken[] {
  const tokens: FuriganaToken[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  RUBY_REGEX.lastIndex = 0

  while ((match = RUBY_REGEX.exec(html)) !== null) {
    if (match.index > lastIndex) {
      const plainText = html.slice(lastIndex, match.index)
      if (plainText) {
        tokens.push({ surface: plainText, reading: '', isKanji: false })
      }
    }

    tokens.push({
      surface: match[1],
      reading: match[2],
      isKanji: true,
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < html.length) {
    const remaining = html.slice(lastIndex)
    if (remaining) {
      tokens.push({ surface: remaining, reading: '', isKanji: false })
    }
  }

  return tokens
}

export function filterByStage(
  tokens: FuriganaToken[],
  stage: PracticeStage,
  masteredWords?: Set<string>
): FuriganaToken[] {
  // Stage 1: show all readings (furigana)
  // Stage 2: show all readings (same as 1, but no romaji — handled in LyricsLine)
  // Stage 3: hide readings for "mastered" words only (with no mastery data, same as stage 4)
  // Stage 4: hide all readings
  // Stage 5: hide all readings + translation (handled in LyricsLine)
  if (stage <= 2) return tokens
  if (stage >= 4) {
    return tokens.map((t) => (t.isKanji ? { ...t, reading: '' } : t))
  }
  // stage 3: hide readings unless word is NOT mastered
  return tokens.map((t) => {
    if (!t.isKanji) return t
    if (masteredWords?.has(t.surface)) {
      return { ...t, reading: '' }
    }
    // Without mastery data, treat all as unmastered → show reading
    return t
  })
}
