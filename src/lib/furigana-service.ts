import { toHiragana as wanakanaToHiragana, toRomaji as wanakanaToRomaji } from 'wanakana'
import { alignFurigana, alignFuriganaFallback } from './align-furigana'
import { getJapaneseTokenizer } from './japanese-tokenizer'
import type { JapaneseToken } from './japanese-tokenizer'
import type { FuriganaToken } from '../types'

export const FURIGANA_VERSION = 6

const LYRIC_READING_OVERRIDES: Array<{
  match: (surface: string, token: JapaneseToken) => boolean
  reading: (surface: string) => string
}> = [
  {
    match: (surface) => surface.startsWith('彷徨'),
    reading: (surface) => inflectStemReading(surface, '彷徨', 'さまよ'),
  },
]

/**
 * Compute furigana tokens for a single lyric line.
 * Returns null if alignment fails (romaji doesn't match original).
 */
export async function computeFuriganaForLine(original: string, romaji: string): Promise<FuriganaToken[] | null> {
  if (!original.trim()) return null

  const cleaned = stripInlineKanaAnnotations(original)

  const tokenized = await computeFuriganaWithTokenizer(cleaned)
  const fromRomaji = computeFuriganaFromRomaji(cleaned, romaji)

  if (fromRomaji?.some((token) => token.isKanji && token.source === 'romaji_strict')) {
    return fromRomaji
  }

  if (tokenized?.some((token) => token.isKanji && token.reading)) {
    return mergeTokenizerAndRomajiTokens(tokenized, fromRomaji)
  }

  return fromRomaji
}

async function computeFuriganaWithTokenizer(original: string): Promise<FuriganaToken[] | null> {
  try {
    const tokenizer = await getJapaneseTokenizer()
    const tokens = tokenizer.tokenize(original)
    const result: FuriganaToken[] = []

    for (const token of tokens) {
      const surface = token.surface_form
      if (!surface) continue

      const reading = getPreferredReading(token)

      if (containsKanji(surface) && reading) {
        const aligned = alignFurigana(surface, reading) ?? alignFuriganaFallback(surface, reading)
        if (aligned.some((item) => item.isKanji && item.reading)) {
          result.push(...aligned.map((item) => item.isKanji
            ? { ...item, confidence: 'high' as const, source: 'tokenizer' as const }
            : item))
          continue
        }

        if (isAllKanji(surface)) {
          result.push({ surface, reading, isKanji: true, confidence: 'medium' as const, source: 'tokenizer' as const })
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

export function tokensToDisplayRomaji(tokens: FuriganaToken[]): string {
  const pieces = tokens
    .map((token) => romajiPieceFromFuriganaToken(token))
    .filter(Boolean)

  return normalizeDisplayRomaji(pieces)
}

export async function computeDisplayRomaji(original: string, romaji: string): Promise<string> {
  const furigana = await computeFuriganaForLine(original, romaji)
  if (furigana?.length) {
    return tokensToDisplayRomaji(furigana)
  }

  const cleaned = stripInlineKanaAnnotations(original)
  if (!cleaned.trim()) return ''

  try {
    const tokenizer = await getJapaneseTokenizer()
    const pieces = tokenizer
      .tokenize(cleaned)
      .map((token) => romajiPieceForToken(token))
      .filter(Boolean)

    if (pieces.length > 0) {
      return normalizeDisplayRomaji(pieces)
    }
  } catch {
    // Fall back to source romaji normalization below.
  }

  return normalizeFallbackRomaji(romaji)
}

function stripInlineKanaAnnotations(original: string): string {
  // Strip inline furigana annotations like 宇宙（そら）→ 宇宙.
  return original.replace(
    /[（(][\u3040-\u309f\u30a0-\u30ff\u30fc]+[）)]/g,
    (match, offset) => {
      if (offset > 0 && /[\u4e00-\u9faf\u3400-\u4dbf]/.test(original[offset - 1])) {
        return ''
      }
      return match
    },
  )
}

function romajiPieceForToken(token: JapaneseToken): string {
  const surface = token.surface_form
  if (!surface) return ''

  const source = getPreferredReading(token) || surface

  if (!containsJapanese(source) && !containsJapanese(surface)) {
    return surface
  }

  if (token.pos === '助詞') {
    if (surface === 'は') return 'wa'
    if (surface === 'へ') return 'e'
    if (surface === 'を') return 'o'
  }

  return wanakanaToRomaji(source)
}

function romajiPieceFromFuriganaToken(token: FuriganaToken): string {
  const surface = token.surface
  if (!surface) return ''

  const source = token.reading || surface
  if (!containsJapanese(source) && !containsJapanese(surface)) {
    return surface
  }

  if (!token.isKanji) {
    if (surface === 'は') return 'wa'
    if (surface === 'へ') return 'e'
    if (surface === 'を') return 'o'
  }

  return wanakanaToRomaji(source)
}

function normalizeDisplayRomaji(pieces: string[]): string {
  let result = ''

  for (const piece of pieces) {
    const trimmed = piece.trim()
    if (!trimmed) continue

    if (!result) {
      result = trimmed
      continue
    }

    if (shouldAttachToPrevious(trimmed) || shouldAttachNextToPrevious(result)) {
      result += trimmed
      continue
    }

    result += ` ${trimmed}`
  }

  return result.replace(/\s+/g, ' ').trim()
}

function normalizeFallbackRomaji(romaji: string): string {
  const parts = romaji.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''

  const shortLatinParts = parts.filter((part) => /^[a-z]+$/i.test(part) && part.length <= 2).length
  if (shortLatinParts >= Math.ceil(parts.length * 0.6)) {
    const joined = parts.join('')
    return joined.toLowerCase()
  }

  return parts.join(' ')
}

function shouldAttachToPrevious(piece: string): boolean {
  return /^[,.;:!?)}\]]/.test(piece)
}

function shouldAttachNextToPrevious(result: string): boolean {
  return /[(\[{/-]$/.test(result)
}

function containsJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf]/.test(text)
}

function computeFuriganaFromRomaji(original: string, romaji: string): FuriganaToken[] | null {
  if (!romaji.trim()) return null

  const hiragana = romajiToHiragana(original, romaji)
  const strict = alignFurigana(original, hiragana)
  if (strict) {
    return strict.map((token) => token.isKanji
      ? { ...token, confidence: 'medium', source: 'romaji_strict' as const }
      : token)
  }

  const fallback = alignFuriganaFallback(original, hiragana)
  if (!fallback.some((token) => token.isKanji && token.reading)) {
    return null
  }

  return fallback.map((token) => token.isKanji && token.reading
    ? { ...token, confidence: 'low', source: 'romaji_fallback' as const }
    : token)
}

function romajiToHiragana(original: string, romaji: string): string {
  const nonJapanese = new Set(
    (original.match(/[a-zA-Z][a-zA-Z0-9]*|[0-9]+/g) || []),
  )

  const parts = romaji.split(/\s+/).filter(Boolean)
  const converted = parts.map((part) => {
    if (nonJapanese.has(part)) return part
    return part.replace(/[a-zA-Z]+/g, (value) => wanakanaToHiragana(value))
  })

  return converted.join('')
}

function mergeTokenizerAndRomajiTokens(
  tokenizerTokens: FuriganaToken[],
  romajiTokens: FuriganaToken[] | null,
): FuriganaToken[] {
  if (!romajiTokens?.some((token) => token.isKanji && token.reading)) {
    return tokenizerTokens
  }

  const tokenizerKanji = tokenizerTokens.filter((token) => token.isKanji)
  const romajiKanji = romajiTokens.filter((token) => token.isKanji)
  if (tokenizerKanji.length === 0 || tokenizerKanji.length !== romajiKanji.length) {
    return tokenizerTokens
  }

  if (!tokenizerKanji.every((token, index) => token.surface === romajiKanji[index].surface)) {
    return tokenizerTokens
  }

  const merged = [...tokenizerTokens]
  let romajiIndex = 0

  for (let i = 0; i < merged.length; i++) {
    const token = merged[i]
    if (!token.isKanji) continue

    const romajiToken = romajiKanji[romajiIndex++]
    if (!romajiToken?.reading || token.reading === romajiToken.reading) continue

    merged[i] = {
      ...token,
      reading: romajiToken.reading,
      confidence: romajiToken.confidence,
      source: romajiToken.source,
    }
  }

  return merged
}

function getPreferredReading(token: JapaneseToken): string {
  const surface = token.surface_form
  if (!surface) return ''

  const override = LYRIC_READING_OVERRIDES.find((entry) => entry.match(surface, token))
  if (override) {
    return override.reading(surface)
  }

  return token.reading && token.reading !== '*'
    ? wanakanaToHiragana(token.reading)
    : ''
}

function inflectStemReading(surface: string, stemSurface: string, stemReading: string): string {
  if (!surface.startsWith(stemSurface)) return stemReading
  const suffix = surface.slice(stemSurface.length)
  if (!suffix) return stemReading
  return `${stemReading}${wanakanaToHiragana(suffix)}`
}
