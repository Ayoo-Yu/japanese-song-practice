export interface Song {
  id: string
  neteaseId: number
  title: string
  artist: string
  album?: string
  albumArtUrl?: string
  durationMs?: number
  audioUrl?: string
  audioUrlFetchedAt?: string
  lrcRaw?: string
  lrcParsed?: ParsedLine[]
  // Pre-computed lyrics for each stage
  stageLyrics?: Record<number, StageLine[]>
  // Raw annotation data (for future mastery features)
  furiganaData?: FuriganaLine[]
  romajiData?: RomajiLine[]
  // Per-line source data keyed by timeMs (for editing)
  romajiLines?: Record<number, string>
  translationLines?: Record<number, string>
  translation?: string
  furiganaVersion?: number
  // Whole-song lyric timing adjustment. Positive values show lyrics later.
  lyricsOffsetMs?: number
  // Per-line KTV gradient timing overrides, keyed by line index
  calibrations?: Record<number, { startMs: number; endMs: number }>
  // User-confirmed sung readings keyed by `${lineIndex}:${tokenIndex}`.
  furiganaOverrides?: Record<string, string>
  ignoredMediumConfidenceLineIndexes?: number[]
  confirmedFuriganaTokenIds?: string[]
  ignoreAllMediumConfidenceHints?: boolean
}

export interface ParsedLine {
  timeMs: number
  text: string
  index: number
}

export interface StageLine {
  timeMs: number
  original: string
  annotated: string   // HTML with <ruby> for furigana
  romaji: string
  translation: string
}

export interface FuriganaLine {
  lineIndex: number
  words: FuriganaToken[]
}

export interface FuriganaToken {
  surface: string
  reading: string
  isKanji: boolean
  confidence?: 'high' | 'medium' | 'low'
  source?: 'tokenizer' | 'romaji_strict' | 'romaji_fallback' | 'reading_override' | 'user_confirmed'
  /** Internal tokenizer group used to keep display romaji at word boundaries. */
  romajiGroup?: number
  /** Whether this tokenizer group is a grammatical suffix of the previous group. */
  romajiJoinPrevious?: boolean
}

export interface RomajiLine {
  lineIndex: number
  romaji: string
}
