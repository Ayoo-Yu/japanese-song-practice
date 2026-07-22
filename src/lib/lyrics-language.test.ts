import { describe, expect, it } from 'vitest'
import { shouldAnnotateJapaneseLyrics } from './lyrics-language'
import type { ParsedLine } from '../types'

function lines(...texts: string[]): ParsedLine[] {
  return texts.map((text, index) => ({ timeMs: index * 1000, text, index }))
}

describe('shouldAnnotateJapaneseLyrics', () => {
  it('keeps Chinese lyrics on the plain-text path', () => {
    expect(shouldAnnotateJapaneseLyrics(lines('作词：汀洲', '我也算万种风情'))).toBe(false)
  })

  it('recognizes Japanese kana', () => {
    expect(shouldAnnotateJapaneseLyrics(lines('夜に駆ける'))).toBe(true)
  })

  it('uses supplied romaji for kanji-only Japanese lyrics', () => {
    expect(shouldAnnotateJapaneseLyrics(lines('群青'), ['gunjou'])).toBe(true)
  })
})
