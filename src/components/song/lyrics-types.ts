import type { FuriganaToken } from '../../types'

export type FuriganaHint = {
  lineIndex: number
  tokenIndex?: number
  surface: string
  reading: string
  confidence: 'high' | 'medium' | 'low'
  source?: FuriganaToken['source']
  saved: boolean
}

export type LyricsStageLine = {
  original: string
  romaji?: string
  translation?: string
  timeMs: number
}

export type RomajiEditState = {
  lineIndex: number
  value: string
  isSaving: boolean
  isSuggesting?: boolean
  suggestion?: string
  feedback?: { tone: 'success' | 'error'; text: string }
}
