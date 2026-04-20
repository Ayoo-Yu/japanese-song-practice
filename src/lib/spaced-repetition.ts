interface SRState {
  masteryLevel: number
  easeFactor: number
  intervalDays: number
}

interface SRResult extends SRState {
  nextReview: string
}

export function calculateNextReview(current: SRState, quality: number): SRResult {
  let { masteryLevel, easeFactor, intervalDays } = current

  if (quality < 3) {
    masteryLevel = Math.max(0, masteryLevel - 1)
    intervalDays = quality === 0 ? 0 : 1
  } else {
    masteryLevel = Math.min(5, masteryLevel + 1)
    if (intervalDays === 0) intervalDays = 1
    else if (intervalDays === 1) intervalDays = 3
    else intervalDays = Math.round(intervalDays * easeFactor)
  }

  easeFactor = Math.max(
    1.3,
    Math.min(3.0, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  )

  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + intervalDays)

  return { masteryLevel, easeFactor, intervalDays, nextReview: nextReview.toISOString().split('T')[0] }
}
