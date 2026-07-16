import { describe, expect, it } from 'vitest'
import { buildQuizSession, extractFuriganaPool } from './quiz-service'
import type { Song } from '../types'

const baseSong: Song = {
  id: '1',
  neteaseId: 1,
  title: 'test',
  artist: 'test',
  lrcParsed: [{ timeMs: 0, text: '米津と夢', index: 0 }],
  romajiLines: { 0: 'yonezu to yume' },
  furiganaData: [{
    lineIndex: 0,
    words: [
      { surface: '米津', reading: 'よねづ', isKanji: true, confidence: 'medium', source: 'tokenizer' },
      { surface: 'と', reading: 'と', isKanji: false },
      { surface: '夢', reading: 'ゆめ', isKanji: true, confidence: 'high', source: 'tokenizer' },
    ],
  }],
}

describe('quiz trust gates', () => {
  it('excludes unconfirmed medium-confidence readings from the pool', () => {
    expect(extractFuriganaPool(baseSong)).toEqual(['ゆめ'])
  })

  it('does not ask line-level romaji while any kanji reading is untrusted', () => {
    expect(buildQuizSession(baseSong, 'romaji').questions).toHaveLength(0)
  })

  it('can still ask a trusted word from a mixed-confidence line', () => {
    const questions = buildQuizSession(baseSong, 'furigana').questions
    expect(questions).toHaveLength(1)
    expect(questions[0].highlightedWord).toBe('夢')
  })
})
