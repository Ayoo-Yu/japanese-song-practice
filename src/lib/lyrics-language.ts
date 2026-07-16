import type { ParsedLine } from '../types'

const KANA_PATTERN = /[\u3040-\u30ff\uff66-\uff9f]/

/**
 * Decide whether lyrics should go through Japanese tokenization.
 * Han characters alone are not enough because Chinese lyrics share that range.
 */
export function shouldAnnotateJapaneseLyrics(
  lines: ParsedLine[],
  romajiValues: Iterable<string> = [],
): boolean {
  for (const value of romajiValues) {
    if (value.trim()) return true
  }

  return lines.some((line) => KANA_PATTERN.test(line.text))
}
