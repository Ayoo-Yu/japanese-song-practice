import { describe, expect, it } from 'vitest'
import { applyFuriganaOverrides } from './furigana-overrides'
import type { FuriganaLine } from '../types'

const data: FuriganaLine[] = [{
  lineIndex: 2,
  words: [
    { surface: '宇宙', reading: 'うちゅう', isKanji: true, confidence: 'medium', source: 'tokenizer' },
    { surface: 'へ', reading: 'へ', isKanji: false },
  ],
}]

describe('furigana overrides', () => {
  it('keeps a user-confirmed sung reading', () => {
    const result = applyFuriganaOverrides(data, ['2:0'], { '2:0': 'そら' })
    expect(result[0].words[0]).toMatchObject({
      reading: 'そら',
      confidence: 'high',
      source: 'user_confirmed',
    })
  })

  it('does not apply kanji overrides to plain kana tokens', () => {
    const result = applyFuriganaOverrides(data, ['2:1'], { '2:1': 'え' })
    expect(result[0].words[1]).toEqual(data[0].words[1])
  })
})
