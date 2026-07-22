import type { FuriganaLine, FuriganaToken } from '../types'

export function buildFuriganaTokenId(lineIndex: number, tokenIndex: number): string {
  return `${lineIndex}:${tokenIndex}`
}

export function applyFuriganaOverrides(
  furiganaData: FuriganaLine[],
  confirmedTokenIds?: string[],
  readingOverrides?: Record<string, string>,
): FuriganaLine[] {
  const confirmed = new Set(confirmedTokenIds ?? [])
  const overrides = readingOverrides ?? {}
  if (confirmed.size === 0 && Object.keys(overrides).length === 0) return furiganaData

  return furiganaData.map((line) => ({
    ...line,
    words: line.words.map((word, tokenIndex) => applyTokenOverride(
      word,
      buildFuriganaTokenId(line.lineIndex, tokenIndex),
      confirmed,
      overrides,
    )),
  }))
}

function applyTokenOverride(
  word: FuriganaToken,
  tokenId: string,
  confirmed: Set<string>,
  overrides: Record<string, string>,
): FuriganaToken {
  if (!word.isKanji) return word

  const reading = overrides[tokenId]?.trim()
  if (!reading && !confirmed.has(tokenId)) return word

  return {
    ...word,
    ...(reading ? { reading } : {}),
    confidence: 'high',
    source: 'user_confirmed',
  }
}
