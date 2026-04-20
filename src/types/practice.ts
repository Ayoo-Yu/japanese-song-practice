export type PracticeStage = 1 | 2 | 3 | 4 | 5

export type LineStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export type ExerciseType = 'line_by_line' | 'fill_blank' | 'word_review'

export interface WordMastery {
  id: string
  userId: string
  word: string
  reading: string
  masteryLevel: number
  easeFactor: number
  intervalDays: number
  nextReview: string
  reviewCount: number
  lapseCount: number
  sourceSongs: { songId: string; lineIdx: number }[]
}

export interface LineMastery {
  id: string
  userId: string
  songId: string
  lineIndex: number
  status: LineStatus
  correctCount: number
  attemptCount: number
}

export interface UserSong {
  id: string
  userId: string
  songId: string
  currentStage: PracticeStage
  lastPracticedAt?: string
  playCount: number
}

export interface PracticeSession {
  id: string
  userId: string
  songId: string
  exerciseType: ExerciseType
  stage: PracticeStage
  score?: number
  itemsTotal?: number
  itemsCorrect?: number
  startedAt: string
  completedAt?: string
}
