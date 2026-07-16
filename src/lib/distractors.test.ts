import { describe, expect, it } from 'vitest'
import { generateDistractors } from './distractors'

describe('generateDistractors', () => {
  it('always returns unique choices that differ from the answer', () => {
    const result = generateDistractors('あ', ['あ', 'あ'], 3)
    expect(result).toHaveLength(3)
    expect(new Set(result).size).toBe(3)
    expect(result).not.toContain('あ')
  })
})
