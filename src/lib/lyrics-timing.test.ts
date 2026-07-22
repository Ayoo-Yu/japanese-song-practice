import { describe, expect, it } from 'vitest'
import {
  clampLyricsOffsetMs,
  findCurrentLine,
  getLineProgress,
  getLineStartMs,
  getLineWindow,
} from './lyrics-timing'

const lines = [{ timeMs: 1000 }, { timeMs: 3000 }, { timeMs: 6000 }]

describe('lyrics timing', () => {
  it('uses source timestamps without a hidden lead', () => {
    expect(findCurrentLine(lines, 999, {})).toBe(-1)
    expect(findCurrentLine(lines, 1000, {})).toBe(0)
  })

  it('supports whole-song early and late adjustments', () => {
    expect(getLineStartMs(lines, 0, undefined, 400)).toBe(1400)
    expect(findCurrentLine(lines, 1200, {}, 400)).toBe(-1)
    expect(getLineStartMs(lines, 0, undefined, -200)).toBe(800)
  })

  it('lets per-line calibration override the whole-song adjustment', () => {
    const calibration = { startMs: 1250, endMs: 2750 }
    expect(getLineWindow(lines, 0, calibration, 500)).toEqual({ start: 1250, end: 2750 })
    expect(getLineProgress(lines, 0, 2000, calibration, 500)).toBe(0.5)
  })

  it('clamps unsafe offsets', () => {
    expect(clampLyricsOffsetMs(99_000)).toBe(5000)
    expect(clampLyricsOffsetMs(-99_000)).toBe(-5000)
    expect(clampLyricsOffsetMs(Number.NaN)).toBe(0)
  })
})
