import { toHiragana as wanakanaToHiragana } from 'wanakana'
import { alignFurigana } from './align-furigana'
import type { FuriganaToken } from '../types'

/**
 * Compute furigana tokens for a single lyric line.
 * Returns null if alignment fails (romaji doesn't match original).
 */
export function computeFuriganaForLine(original: string, romaji: string): FuriganaToken[] | null {
  if (!original.trim() || !romaji.trim()) return null

  // Strip inline furigana annotations like 宇宙（そら）→ 宇宙
  // The romaji already provides the reading, so these parenthetical hints are redundant
  const cleaned = original.replace(
    /[（(][\u3040-\u309f\u30a0-\u30ff\u30fc]+[）)]/g,
    (match, offset) => {
      if (offset > 0 && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(original[offset - 1])) {
        return ''
      }
      return match
    },
  )

  // Find English words and numbers — these must not be converted to kana
  const nonJapanese = new Set(
    (cleaned.match(/[a-zA-Z][a-zA-Z0-9]*|[0-9]+/g) || []),
  )

  // Split romaji by whitespace, preserve English/number words, convert only romaji parts
  const parts = romaji.split(/\s+/).filter(Boolean)
  const converted = parts.map((part) => {
    if (nonJapanese.has(part)) return part
    return part.replace(/[a-zA-Z]+/g, (m) => wanakanaToHiragana(m))
  })

  const hiragana = converted.join('')
  return alignFurigana(cleaned, hiragana)
}

/**
 * Convert furigana tokens to HTML with <ruby> tags.
 */
export function tokensToHtml(tokens: FuriganaToken[]): string {
  return tokens.map((t) => {
    if (t.isKanji) {
      return `<ruby>${t.surface}<rp>(</rp><rt>${t.reading}</rt><rp>)</rp></ruby>`
    }
    return t.surface
  }).join('')
}
