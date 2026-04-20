import type { Song, FuriganaLine } from '../types'
import { computeFuriganaForLine } from '../lib/furigana-service'
import { buildStageLyrics } from './lyrics-service'

const STORAGE_KEY = 'jpsong_songs'

function loadAll(): Song[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAll(songs: Song[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs))
}

function generateId(): string {
  return crypto.randomUUID()
}

export async function getSongByNeteaseId(neteaseId: number): Promise<Song | null> {
  return loadAll().find((s) => s.neteaseId === neteaseId) ?? null
}

export async function getSongById(id: string): Promise<Song | null> {
  return loadAll().find((s) => s.id === id) ?? null
}

export async function saveSong(song: Song): Promise<Song> {
  const songs = loadAll()
  const existingIdx = songs.findIndex((s) => s.neteaseId === song.neteaseId)

  const saved: Song = {
    ...song,
    id: existingIdx >= 0 ? songs[existingIdx].id : generateId(),
  }

  if (existingIdx >= 0) {
    songs[existingIdx] = { ...songs[existingIdx], ...saved }
  } else {
    songs.push(saved)
  }

  saveAll(songs)
  return saved
}

export async function updateAudioUrl(id: string, audioUrl: string): Promise<void> {
  const songs = loadAll()
  const idx = songs.findIndex((s) => s.id === id)
  if (idx >= 0) {
    songs[idx] = { ...songs[idx], audioUrl, audioUrlFetchedAt: new Date().toISOString() }
    saveAll(songs)
  }
}

export async function listUserSongs(): Promise<Song[]> {
  return loadAll()
}

export async function deleteSong(id: string): Promise<void> {
  const songs = loadAll().filter((s) => s.id !== id)
  saveAll(songs)
}

export async function updateLyrics(
  neteaseId: number,
  changes: Array<{ timeMs: number; original?: string; romaji?: string; translation?: string }>,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  // Apply changes to source data
  const romajiLines = { ...song.romajiLines }
  const translationLines = { ...song.translationLines }
  const lrcParsed = [...(song.lrcParsed ?? [])]

  for (const change of changes) {
    if (change.romaji !== undefined) romajiLines[change.timeMs] = change.romaji
    if (change.translation !== undefined) translationLines[change.timeMs] = change.translation
    if (change.original !== undefined) {
      const idx = lrcParsed.findIndex((l) => l.timeMs === change.timeMs)
      if (idx >= 0) lrcParsed[idx] = { ...lrcParsed[idx], text: change.original }
    }
  }

  // Rebuild romaji/translation maps
  const romajiMap = new Map(Object.entries(romajiLines).map(([k, v]) => [Number(k), v]))
  const translationMap = new Map(Object.entries(translationLines).map(([k, v]) => [Number(k), v]))

  // Recompute furigana
  const furiganaData: FuriganaLine[] = []
  for (let i = 0; i < lrcParsed.length; i++) {
    const line = lrcParsed[i]
    const romaji = romajiMap.get(line.timeMs) ?? ''
    const tokens = computeFuriganaForLine(line.text, romaji)
    if (tokens) furiganaData.push({ lineIndex: i, words: tokens })
  }

  const stageLyrics = buildStageLyrics(lrcParsed, romajiMap, translationMap, furiganaData)

  const updated: Song = {
    ...song,
    lrcParsed,
    romajiLines,
    translationLines,
    furiganaData,
    stageLyrics,
  }

  return saveSong(updated)
}

export async function saveCalibrations(
  neteaseId: number,
  calibrations: Record<number, { startMs: number; endMs: number }>,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null
  return saveSong({ ...song, calibrations })
}

export async function updateFuriganaToken(
  neteaseId: number,
  lineIndex: number,
  tokenIndex: number,
  newReading: string,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  const furiganaData = (song.furiganaData ?? []).map((fl) => ({
    ...fl,
    words: [...fl.words],
  }))

  const targetLine = furiganaData.find((fl) => fl.lineIndex === lineIndex)
  if (!targetLine || tokenIndex >= targetLine.words.length) return null

  targetLine.words[tokenIndex] = {
    ...targetLine.words[tokenIndex],
    reading: newReading,
  }

  const lrcParsed = song.lrcParsed ?? []
  const romajiMap = new Map(Object.entries(song.romajiLines ?? {}).map(([k, v]) => [Number(k), v]))
  const translationMap = new Map(Object.entries(song.translationLines ?? {}).map(([k, v]) => [Number(k), v]))
  const stageLyrics = buildStageLyrics(lrcParsed, romajiMap, translationMap, furiganaData)

  return saveSong({ ...song, furiganaData, stageLyrics })
}
