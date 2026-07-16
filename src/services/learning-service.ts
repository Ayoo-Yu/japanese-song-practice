import { calculateNextReview } from '../lib/spaced-repetition'
import type { PracticeStage, WordMastery } from '../types'
import type { QuizQuestion } from './quiz-service'

export const LEARNING_STORAGE_KEY = 'jpsong_learning_v1'
const LOCAL_USER_ID = 'local'

export interface SongLearningProgress {
  neteaseId: number
  currentStage: PracticeStage
  lastPracticedAt?: string
  answerCount: number
  correctCount: number
}

interface LineProgress {
  id: string
  neteaseId: number
  lineIndex: number
  attemptCount: number
  correctCount: number
}

interface LearningState {
  schemaVersion: 1
  songs: Record<string, SongLearningProgress>
  words: Record<string, WordMastery>
  lines: Record<string, LineProgress>
}

function emptyState(): LearningState {
  return { schemaVersion: 1, songs: {}, words: {}, lines: {} }
}

function loadState(): LearningState {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<LearningState>
    if (parsed.schemaVersion !== 1) return emptyState()
    return {
      schemaVersion: 1,
      songs: parsed.songs ?? {},
      words: parsed.words ?? {},
      lines: parsed.lines ?? {},
    }
  } catch {
    return emptyState()
  }
}

function saveState(state: LearningState): void {
  try {
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Learning progress should never block playback or practice.
  }
}

function defaultSongProgress(neteaseId: number): SongLearningProgress {
  return { neteaseId, currentStage: 1, answerCount: 0, correctCount: 0 }
}

export function getSongLearningProgress(neteaseId: number): SongLearningProgress {
  return loadState().songs[String(neteaseId)] ?? defaultSongProgress(neteaseId)
}

export function listSongLearningProgress(): SongLearningProgress[] {
  return Object.values(loadState().songs)
}

export function setSongLearningStage(neteaseId: number, currentStage: PracticeStage): SongLearningProgress {
  const state = loadState()
  const current = state.songs[String(neteaseId)] ?? defaultSongProgress(neteaseId)
  const updated = { ...current, currentStage }
  state.songs[String(neteaseId)] = updated
  saveState(state)
  return updated
}

export function wordMasteryKey(word: string, reading: string): string {
  return `${word}\u0000${reading}`
}

export function getMasteredWordKeys(): Set<string> {
  const words = Object.values(loadState().words)
  return new Set(
    words
      .filter((word) => word.masteryLevel >= 3)
      .map((word) => wordMasteryKey(word.word, word.reading)),
  )
}

export function getDueWordReviewCount(today: string = new Date().toISOString().slice(0, 10)): number {
  return Object.values(loadState().words)
    .filter((word) => word.nextReview <= today)
    .length
}

export function getSuggestedStage(progress: SongLearningProgress): PracticeStage {
  if (progress.answerCount < 10) return progress.currentStage
  const accuracy = progress.correctCount / progress.answerCount
  if (accuracy >= 0.9 && progress.currentStage < 5) {
    return (progress.currentStage + 1) as PracticeStage
  }
  if (accuracy < 0.6 && progress.currentStage > 1) {
    return (progress.currentStage - 1) as PracticeStage
  }
  return progress.currentStage
}

export function recordQuizAnswer(
  neteaseId: number,
  question: QuizQuestion,
  isCorrect: boolean,
): SongLearningProgress {
  const state = loadState()
  const songKey = String(neteaseId)
  const currentSong = state.songs[songKey] ?? defaultSongProgress(neteaseId)
  const updatedSong: SongLearningProgress = {
    ...currentSong,
    lastPracticedAt: new Date().toISOString(),
    answerCount: currentSong.answerCount + 1,
    correctCount: currentSong.correctCount + (isCorrect ? 1 : 0),
  }
  state.songs[songKey] = updatedSong

  const lineKey = `${neteaseId}:${question.lineIndex}`
  const currentLine = state.lines[lineKey] ?? {
    id: lineKey,
    neteaseId,
    lineIndex: question.lineIndex,
    attemptCount: 0,
    correctCount: 0,
  }
  state.lines[lineKey] = {
    ...currentLine,
    attemptCount: currentLine.attemptCount + 1,
    correctCount: currentLine.correctCount + (isCorrect ? 1 : 0),
  }

  if (question.type === 'furigana' && question.highlightedWord && question.correctReading) {
    const masteryKey = wordMasteryKey(question.highlightedWord, question.correctReading)
    const currentWord = state.words[masteryKey] ?? {
      id: masteryKey,
      userId: LOCAL_USER_ID,
      word: question.highlightedWord,
      reading: question.correctReading,
      masteryLevel: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      nextReview: new Date().toISOString().slice(0, 10),
      reviewCount: 0,
      lapseCount: 0,
      sourceSongs: [],
    }
    const source = { songId: songKey, lineIdx: question.lineIndex }
    const sourceSongs = currentWord.sourceSongs.some(
      (item) => item.songId === source.songId && item.lineIdx === source.lineIdx,
    )
      ? currentWord.sourceSongs
      : [...currentWord.sourceSongs, source]
    const next = calculateNextReview(currentWord, isCorrect ? 5 : 1)
    state.words[masteryKey] = {
      ...currentWord,
      ...next,
      reviewCount: currentWord.reviewCount + 1,
      lapseCount: currentWord.lapseCount + (isCorrect ? 0 : 1),
      sourceSongs,
    }
  }

  saveState(state)
  return updatedSong
}

export function removeSongLearningData(neteaseId: number): void {
  const state = loadState()
  delete state.songs[String(neteaseId)]
  for (const [key, line] of Object.entries(state.lines)) {
    if (line.neteaseId === neteaseId) delete state.lines[key]
  }
  for (const [key, word] of Object.entries(state.words)) {
    const sourceSongs = word.sourceSongs.filter((source) => source.songId !== String(neteaseId))
    if (sourceSongs.length === 0) delete state.words[key]
    else state.words[key] = { ...word, sourceSongs }
  }
  saveState(state)
}
