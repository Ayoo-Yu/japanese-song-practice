import { generateDistractors } from '../lib/distractors'
import type { Song } from '../types'

export type QuizType = 'romaji' | 'furigana' | 'translation'

export interface QuizQuestion {
  type: QuizType
  lineIndex: number
  timeMs: number
  japaneseText: string
  correctRomaji?: string
  correctTranslation?: string
  tokenIndex?: number
  highlightedWord?: string
  correctReading?: string
  choices: string[]
  correctIndex: number
}

export interface QuizSession {
  questions: QuizQuestion[]
  currentIndex: number
  correctCount: number
  wrongCount: number
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function extractFuriganaPool(song: Song): string[] {
  const readings: string[] = []
  for (const fl of song.furiganaData ?? []) {
    for (const w of fl.words) {
      if (w.isKanji && w.reading) readings.push(w.reading)
    }
  }
  return readings
}

export function extractRomajiPool(song: Song): string[] {
  return Object.values(song.romajiLines ?? {}).filter((r) => r.trim().length > 0)
}

export function extractTranslationPool(song: Song): string[] {
  return Object.values(song.translationLines ?? {}).filter((t) => t.trim().length > 0)
}

function buildRomajiQuestion(
  song: Song,
  lineIndex: number,
  distractorPool: string[],
): QuizQuestion | null {
  const line = song.lrcParsed?.[lineIndex]
  if (!line || !line.text.trim()) return null
  const romaji = song.romajiLines?.[line.timeMs]
  if (!romaji || !romaji.trim()) return null

  const wrong = generateDistractors(romaji, distractorPool)
  const choices = shuffle([romaji, ...wrong])
  return {
    type: 'romaji',
    lineIndex,
    timeMs: line.timeMs,
    japaneseText: line.text,
    correctRomaji: romaji,
    choices,
    correctIndex: choices.indexOf(romaji),
  }
}

function buildFuriganaQuestion(
  song: Song,
  lineIndex: number,
  tokenIdx: number,
  distractorPool: string[],
): QuizQuestion | null {
  const line = song.lrcParsed?.[lineIndex]
  const fl = song.furiganaData?.find((f) => f.lineIndex === lineIndex)
  if (!line || !fl) return null
  const token = fl.words[tokenIdx]
  if (!token || !token.isKanji || !token.reading) return null

  const wrong = generateDistractors(token.reading, distractorPool)
  const choices = shuffle([token.reading, ...wrong])
  return {
    type: 'furigana',
    lineIndex,
    timeMs: line.timeMs,
    japaneseText: line.text,
    tokenIndex: tokenIdx,
    highlightedWord: token.surface,
    correctReading: token.reading,
    choices,
    correctIndex: choices.indexOf(token.reading),
  }
}

function buildTranslationQuestion(
  song: Song,
  lineIndex: number,
  distractorPool: string[],
): QuizQuestion | null {
  const line = song.lrcParsed?.[lineIndex]
  if (!line || !line.text.trim()) return null
  const translation = song.translationLines?.[line.timeMs]
  if (!translation || !translation.trim()) return null

  const wrong = generateDistractors(translation, distractorPool)
  const choices = shuffle([translation, ...wrong])
  return {
    type: 'translation',
    lineIndex,
    timeMs: line.timeMs,
    japaneseText: line.text,
    correctTranslation: translation,
    choices,
    correctIndex: choices.indexOf(translation),
  }
}

export function buildQuizSession(
  song: Song,
  type: QuizType,
  maxQuestions: number = 10,
): QuizSession {
  const questions: QuizQuestion[] = []

  if (type === 'romaji') {
    const pool = extractRomajiPool(song)
    const candidates = shuffle(
      (song.lrcParsed ?? [])
        .map((_, i) => i)
        .filter((i) => {
          const line = song.lrcParsed![i]
          return line.text.trim() && song.romajiLines?.[line.timeMs]?.trim()
        }),
    )
    for (const i of candidates) {
      if (questions.length >= maxQuestions) break
      const q = buildRomajiQuestion(song, i, pool)
      if (q) questions.push(q)
    }
  } else if (type === 'translation') {
    const pool = extractTranslationPool(song)
    const candidates = shuffle(
      (song.lrcParsed ?? [])
        .map((_, i) => i)
        .filter((i) => {
          const line = song.lrcParsed![i]
          return line.text.trim() && song.translationLines?.[line.timeMs]?.trim()
        }),
    )
    for (const i of candidates) {
      if (questions.length >= maxQuestions) break
      const q = buildTranslationQuestion(song, i, pool)
      if (q) questions.push(q)
    }
  } else {
    const pool = extractFuriganaPool(song)
    const candidates: Array<{ lineIdx: number; tokenIdx: number }> = []
    for (const fl of song.furiganaData ?? []) {
      const kanjiTokens = fl.words
        .map((w, ti) => ({ w, ti }))
        .filter(({ w }) => w.isKanji && w.reading)
      if (kanjiTokens.length > 0) {
        const pick = kanjiTokens[Math.floor(Math.random() * kanjiTokens.length)]
        candidates.push({ lineIdx: fl.lineIndex, tokenIdx: pick.ti })
      }
    }
    const shuffled = shuffle(candidates)
    for (const { lineIdx, tokenIdx } of shuffled) {
      if (questions.length >= maxQuestions) break
      const q = buildFuriganaQuestion(song, lineIdx, tokenIdx, pool)
      if (q) questions.push(q)
    }
  }

  return { questions, currentIndex: 0, correctCount: 0, wrongCount: 0 }
}
