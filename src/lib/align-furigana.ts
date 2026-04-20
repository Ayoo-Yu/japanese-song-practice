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

// --- Character classification ---

function isPhonetic(ch: string): boolean {
  const c = ch.codePointAt(0)!
  return (
    (c >= 0x3040 && c <= 0x309f) || // hiragana
    (c >= 0x30a0 && c <= 0x30ff) || // katakana
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
  return (c >= 0x4e00 && c <= 0x9faf) || (c >= 0x3400 && c <= 0x4dbf)
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

function expandSmallKana(ch: string): string {
  const i = SMALL_KANA.indexOf(ch)
  return i >= 0 ? LARGE_KANA[i] : ch
}
