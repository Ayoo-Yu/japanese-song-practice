import { beforeEach, describe, expect, it } from 'vitest'
import {
  getMasteredWordKeys,
  getSongLearningProgress,
  recordQuizAnswer,
  setSongLearningStage,
  wordMasteryKey,
} from './learning-service'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

describe('learning progress', () => {
  it('persists the selected stage', () => {
    setSongLearningStage(42, 4)
    expect(getSongLearningProgress(42).currentStage).toBe(4)
  })

  it('promotes a word after repeated successful reviews', () => {
    const question = {
      type: 'furigana' as const,
      lineIndex: 2,
      timeMs: 1000,
      japaneseText: '夢',
      highlightedWord: '夢',
      correctReading: 'ゆめ',
      choices: ['ゆめ'],
      correctIndex: 0,
    }
    recordQuizAnswer(42, question, true)
    recordQuizAnswer(42, question, true)
    recordQuizAnswer(42, question, true)

    expect(getMasteredWordKeys()).toContain(wordMasteryKey('夢', 'ゆめ'))
    expect(getSongLearningProgress(42)).toMatchObject({ answerCount: 3, correctCount: 3 })
  })
})
