import type { FuriganaToken } from '../types'

/**
 * Align Japanese text with its hiragana reading using backtracking.
 *
 * Kana characters serve as anchors. For kanji runs, we try all possible
 * reading lengths and backtrack if the rest of the line fails to align.
 *
 * Returns null if no valid alignment exists.
 */
export function alignFurigana(original: string, hiraganaReading: string): FuriganaToken[] | null {
  const tokens: FuriganaToken[] = []
  if (tryAlign(original, 0, hiraganaReading, 0, tokens)) return tokens
  return null
}

/**
 * Best-effort alignment that preserves any kanji readings we can recover
 * even when the full-line romaji is imperfect.
 */
export function alignFuriganaFallback(original: string, hiraganaReading: string): FuriganaToken[] {
  const tokens: FuriganaToken[] = []
  let oi = 0
  let ri = 0

  while (oi < original.length) {
    const oc = original[oi]

    if (!isPhonetic(oc)) {
      if (ri < hiraganaReading.length && hiraganaReading[ri] === oc) ri++
      tokens.push({ surface: oc, reading: oc, isKanji: false })
      oi++
      continue
    }

    if (isKana(oc)) {
      const matchedIndex = findCompatibleKanaIndex(hiraganaReading, ri, oc, 3)
      if (matchedIndex >= 0) ri = matchedIndex + 1
      tokens.push({ surface: oc, reading: normalizeKana(oc), isKanji: false })
      oi++
      continue
    }

    let end = oi
    while (end < original.length && isKanji(original[end])) end++
    const surface = original.slice(oi, end)

    const repeatedReading = COMMON_ITERATION_READINGS[surface]
    if (repeatedReading) {
      tokens.push({ surface, reading: repeatedReading, isKanji: true })
      ri = advanceReadingByKana(hiraganaReading, ri, repeatedReading)
      oi = end
      continue
    }

    const anchor = findNextKanaAnchor(original, end)
    if (!anchor) {
      const tail = hiraganaReading.slice(ri)
      if (tail && isPureKana(tail)) {
        tokens.push({ surface, reading: tail, isKanji: true })
        ri = hiraganaReading.length
      } else {
        tokens.push({ surface, reading: '', isKanji: false })
      }
      oi = end
      continue
    }

    if (hasKanjiBeforeIndex(original, end, anchor.index)) {
      tokens.push({ surface, reading: '', isKanji: false })
      oi = end
      continue
    }

    const anchorIndex = findCompatibleKanaIndex(hiraganaReading, ri, anchor.char, 12)
    if (anchorIndex <= ri) {
      tokens.push({ surface, reading: '', isKanji: false })
      oi = end
      continue
    }

    const candidate = hiraganaReading.slice(ri, anchorIndex)
    if (candidate && isPureKana(candidate)) {
      tokens.push({ surface, reading: candidate, isKanji: true })
      ri = anchorIndex
    } else {
      tokens.push({ surface, reading: '', isKanji: false })
    }
    oi = end
  }

  return mergeAdjacentPlainTokens(tokens)
}

function tryAlign(orig: string, oi: number, read: string, ri: number, out: FuriganaToken[]): boolean {
  if (oi >= orig.length) return true

  const oc = orig[oi]

  // Non-phonetic: spaces, punctuation, latin, numbers — skip in original
  if (!isPhonetic(oc)) {
    let nri = ri
    if (nri < read.length && read[nri] === oc) nri++
    out.push({ surface: oc, reading: oc, isKanji: false })
    return tryAlign(orig, oi + 1, read, nri, out)
  }

  // Kana (hiragana, katakana, prolonged sound mark)
  if (isKana(oc)) {
    if (ri >= read.length) return false
    if (!kanaCompatible(oc, read[ri])) return false
    out.push({ surface: oc, reading: normalizeKana(read[ri]), isKanji: false })
    return tryAlign(orig, oi + 1, read, ri + 1, out)
  }

  // Kanji run — try all possible reading lengths (longest first)
  if (isKanji(oc)) {
    let end = oi
    while (end < orig.length && isKanji(orig[end])) end++
    const surface = orig.slice(oi, end)

    const repeatedReading = COMMON_ITERATION_READINGS[surface]
    if (repeatedReading) {
      if (!readingMatchesAt(read, ri, repeatedReading)) return false
      out.push({ surface, reading: repeatedReading, isKanji: true })
      return tryAlign(orig, end, read, ri + repeatedReading.length, out)
    }

    const maxLen = read.length - ri
    for (let len = maxLen; len >= 1; len--) {
      const candidate = read.slice(ri, ri + len)
      // Kanji readings must be pure kana — reject if it contains punctuation/symbols
      if (!isPureKana(candidate)) continue
      const savedLen = out.length
      out.push({ surface, reading: candidate, isKanji: true })
      if (tryAlign(orig, end, read, ri + len, out)) return true
      out.length = savedLen
    }
    return false
  }

  // Fallback
  out.push({ surface: oc, reading: oc, isKanji: false })
  return tryAlign(orig, oi + 1, read, ri, out)
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

function findNextKanaAnchor(orig: string, start: number): { index: number; char: string } | null {
  for (let i = start; i < orig.length; i++) {
    if (isKana(orig[i])) return { index: i, char: orig[i] }
  }
  return null
}

function hasKanjiBeforeIndex(orig: string, start: number, end: number): boolean {
  for (let i = start; i < end; i++) {
    if (isKanji(orig[i])) return true
  }
  return false
}

function findCompatibleKanaIndex(read: string, start: number, kana: string, maxLookahead: number): number {
  const end = Math.min(read.length, start + maxLookahead + 1)
  for (let i = start; i < end; i++) {
    if (kanaCompatible(kana, read[i])) return i
  }
  return -1
}

function advanceReadingByKana(read: string, start: number, kana: string): number {
  let ri = start
  for (const ch of kana) {
    const matchedIndex = findCompatibleKanaIndex(read, ri, ch, 2)
    if (matchedIndex < 0) return start
    ri = matchedIndex + 1
  }
  return ri
}

function readingMatchesAt(read: string, start: number, kana: string): boolean {
  if (start + kana.length > read.length) return false
  for (let i = 0; i < kana.length; i++) {
    if (!kanaCompatible(kana[i], read[start + i])) return false
  }
  return true
}

// --- Character classification ---

function isPhonetic(ch: string): boolean {
  const c = ch.codePointAt(0)!
  return (
    (c >= 0x3040 && c <= 0x309f) || // hiragana
    (c >= 0x30a0 && c <= 0x30ff) || // katakana
    c === 0x3005 ||                 // ideographic iteration mark 々
    (c >= 0x4e00 && c <= 0x9faf) || // kanji
    (c >= 0x3400 && c <= 0x4dbf)    // rare kanji
  )
}

function isKana(ch: string): boolean {
  const c = ch.codePointAt(0)!
  return (
    (c >= 0x3040 && c <= 0x309f) || // hiragana
    (c >= 0x30a0 && c <= 0x30ff) || // katakana (includes ー)
    (c >= 0xff66 && c <= 0xff9f)    // halfwidth katakana
  )
}

function isKanji(ch: string): boolean {
  const c = ch.codePointAt(0)!
  return c === 0x3005 || (c >= 0x4e00 && c <= 0x9faf) || (c >= 0x3400 && c <= 0x4dbf)
}

function isPureKana(str: string): boolean {
  for (const ch of str) {
    const c = ch.codePointAt(0)!
    const isHiragana = c >= 0x3040 && c <= 0x309f
    const isKatakana = c >= 0x30a0 && c <= 0x30ff
    const isHalfKana = c >= 0xff66 && c <= 0xff9f
    if (!isHiragana && !isKatakana && !isHalfKana) return false
  }
  return true
}

// --- Kana matching helpers ---

function normalizeKana(ch: string): string {
  const c = ch.codePointAt(0)!
  if (c >= 0x30a1 && c <= 0x30f6) return String.fromCodePoint(c - 0x60)
  return ch
}

/** Check if original kana and reading kana are compatible */
function kanaCompatible(origChar: string, readChar: string): boolean {
  const o = normalizeKana(origChar)
  const r = normalizeKana(readChar)
  if (o === r) return true

  // ー (prolonged sound mark) matches any vowel kana
  if (o === 'ー' && isVowelKana(r)) return true
  if (r === 'ー' && isVowelKana(o)) return true

  // Particle readings: は↔わ, へ↔え
  if ((o === 'は' && r === 'わ') || (o === 'わ' && r === 'は')) return true
  if ((o === 'へ' && r === 'え') || (o === 'え' && r === 'へ')) return true

  // Homophone kana: づ↔ず, ぢ↔じ (wanakana always maps zu→ず, ji→じ)
  if ((o === 'づ' && r === 'ず') || (o === 'ず' && r === 'づ')) return true
  if ((o === 'ぢ' && r === 'じ') || (o === 'じ' && r === 'ぢ')) return true

  // Small/large kana: ぁ↔あ etc.
  if (expandSmallKana(o) === expandSmallKana(r)) return true

  return false
}

const VOWEL_KANA = new Set(['あ', 'い', 'う', 'え', 'お'])
function isVowelKana(ch: string): boolean {
  return VOWEL_KANA.has(ch)
}

const SMALL_KANA = 'ぁぃぅぇぉゃゅょっゎヶ'
const LARGE_KANA = 'あいうえおやゆよつわけ'

const COMMON_ITERATION_READINGS: Record<string, string> = {
  '日々': 'ひび',
  '人々': 'ひとびと',
  '時々': 'ときどき',
  '様々': 'さまざま',
  '色々': 'いろいろ',
  '我々': 'われわれ',
  '刻々': 'こくこく',
}

function expandSmallKana(ch: string): string {
  const i = SMALL_KANA.indexOf(ch)
  return i >= 0 ? LARGE_KANA[i] : ch
}
