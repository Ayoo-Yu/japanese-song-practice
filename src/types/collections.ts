export interface SavedWord {
  id: string
  neteaseId: number
  songTitle: string
  artist: string
  lineIndex: number
  lineText: string
  surface: string
  reading: string
  savedAt: string
}

export interface SavedLine {
  id: string
  neteaseId: number
  songTitle: string
  artist: string
  lineIndex: number
  lineText: string
  romaji?: string
  translation?: string
  savedAt: string
}
