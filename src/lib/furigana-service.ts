import { toHiragana as wanakanaToHiragana } from 'wanakana'
import { alignFurigana, alignFuriganaFallback } from './align-furigana'
import { getJapaneseTokenizer } from './japanese-tokenizer'
import type { FuriganaToken } from '../types'

export const FURIGANA_VERSION = 2

/**
 * Compute furigana tokens for a single lyric line.
 * Returns null if alignment fails (romaji doesn't match original).
 */
export async function computeFuriganaForLine(original: string, romaji: string): Promise<FuriganaToken[] | null> {
  if (!original.trim()) return null

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

  const tokenized = await computeFuriganaWithTokenizer(cleaned)
  if (tokenized?.some((token) => token.isKanji && token.reading)) {
    return tokenized
  }

  if (!romaji.trim()) return null

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
  return alignFurigana(cleaned, hiragana) ?? alignFuriganaFallback(cleaned, hiragana)
}

async function computeFuriganaWithTokenizer(original: string): Promise<FuriganaToken[] | null> {
  try {
    const tokenizer = await getJapaneseTokenizer()
    const tokens = tokenizer.tokenize(original)
    const result: FuriganaToken[] = []

    for (const token of tokens) {
      const surface = token.surface_form
      if (!surface) continue

      const reading = token.reading && token.reading !== '*'
        ? wanakanaToHiragana(token.reading)
        : ''

      if (containsKanji(surface) && reading) {
        const aligned = alignFurigana(surface, reading) ?? alignFuriganaFallback(surface, reading)
        if (aligned.some((item) => item.isKanji && item.reading)) {
          result.push(...aligned)
          continue
        }

        if (isAllKanji(surface)) {
          result.push({ surface, reading, isKanji: true })
          continue
        }
      }

      result.push({ surface, reading: surface, isKanji: false })
    }

    return mergeAdjacentPlainTokens(result)
  } catch {
    return null
  }
}

function mergeAdjacentPlainTokens(tokens: FuriganaToken[]): FuriganaToken[] {
  const merged: FuriganaToken[] = []
  for (const token of tokens) {
    const prev = merged[merged.length - 1]
    if (
      prev &&
      !prev.isKanji &&
      !token.isKanji &&
      prev.reading === prev.surface &&
      token.reading === token.surface
    ) {
      prev.surface += token.surface
      prev.reading += token.reading
      continue
    }
    merged.push({ ...token })
  }
  return merged
}

function containsKanji(text: string): boolean {
  return [...text].some((char) => isKanji(char))
}

function isAllKanji(text: string): boolean {
  return [...text].every((char) => isKanji(char))
}

function isKanji(char: string): boolean {
  const code = char.codePointAt(0)!
  return code === 0x3005 || (code >= 0x4e00 && code <= 0x9faf) || (code >= 0x3400 && code <= 0x4dbf)
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
