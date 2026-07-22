import { toHiragana as wanakanaToHiragana } from 'wanakana'
import type { Song, FuriganaLine } from '../types'
import { computeFuriganaForLine, FURIGANA_VERSION } from '../lib/furigana-service'
import { applyFuriganaOverrides, buildFuriganaTokenId } from '../lib/furigana-overrides'
import { clampLyricsOffsetMs } from '../lib/lyrics-timing'
import { shouldAnnotateJapaneseLyrics } from '../lib/lyrics-language'
import { buildStageLyrics } from './lyrics-service'
import { removeSavedItemsForSong } from './collections-service'
import { removeSongLearningData } from './learning-service'

export const SONGS_STORAGE_KEY = 'jpsong_songs'

function loadAll(): Song[] {
  try {
    const raw = localStorage.getItem(SONGS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as Song[] : []
  } catch {
    return []
  }
}

function saveAll(songs: Song[]): void {
  try {
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify(songs))
  } catch {
    throw new Error('本地存储空间不足，歌曲未能保存。请先在设置中导出备份并清理不需要的数据。')
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
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

export async function ensureSongPersisted(song: Song): Promise<Song> {
  const existing = await getSongByNeteaseId(song.neteaseId)
  if (existing) {
    const merged: Song = {
      ...existing,
      ...song,
      id: existing.id,
    }
    return saveSong(merged)
  }
  return saveSong(song)
}

export async function updateAudioUrl(id: string, audioUrl?: string): Promise<void> {
  const songs = loadAll()
  const idx = songs.findIndex((s) => s.id === id)
  if (idx >= 0) {
    songs[idx] = {
      ...songs[idx],
      audioUrl,
      audioUrlFetchedAt: audioUrl ? new Date().toISOString() : undefined,
    }
    saveAll(songs)
  }
}

export async function listUserSongs(): Promise<Song[]> {
  return loadAll()
}

export async function deleteSong(id: string): Promise<boolean> {
  const songs = loadAll()
  const target = songs.find((song) => song.id === id)
  if (!target) return false

  saveAll(songs.filter((song) => song.id !== id))
  await removeSavedItemsForSong(target.neteaseId)
  removeSongLearningData(target.neteaseId)
  return true
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
  const annotateJapanese = shouldAnnotateJapaneseLyrics(lrcParsed, romajiMap.values())

  // Recompute furigana
  const furiganaData: FuriganaLine[] = []
  if (annotateJapanese) {
    for (let i = 0; i < lrcParsed.length; i++) {
      const line = lrcParsed[i]
      const romaji = romajiMap.get(line.timeMs) ?? ''
      const tokens = await computeFuriganaForLine(line.text, romaji)
      if (tokens) furiganaData.push({ lineIndex: i, words: tokens })
    }
  }

  const resolvedFuriganaData = applyFuriganaOverrides(
    furiganaData,
    song.confirmedFuriganaTokenIds,
    song.furiganaOverrides,
  )
  const stageLyrics = await buildStageLyrics(
    lrcParsed,
    romajiMap,
    translationMap,
    resolvedFuriganaData,
    annotateJapanese,
  )

  const updated: Song = {
    ...song,
    lrcParsed,
    romajiLines,
    translationLines,
    furiganaData: resolvedFuriganaData,
    stageLyrics,
    furiganaVersion: FURIGANA_VERSION,
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

export async function saveLyricsOffset(
  neteaseId: number,
  lyricsOffsetMs: number,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null
  return saveSong({ ...song, lyricsOffsetMs: clampLyricsOffsetMs(lyricsOffsetMs) })
}

export async function regenerateFurigana(
  neteaseId: number,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  const lrcParsed = song.lrcParsed ?? []
  const romajiMap = new Map(Object.entries(song.romajiLines ?? {}).map(([k, v]) => [Number(k), v]))
  const translationMap = new Map(Object.entries(song.translationLines ?? {}).map(([k, v]) => [Number(k), v]))
  const annotateJapanese = shouldAnnotateJapaneseLyrics(lrcParsed, romajiMap.values())

  const furiganaData: FuriganaLine[] = []
  if (annotateJapanese) {
    for (let i = 0; i < lrcParsed.length; i++) {
      const line = lrcParsed[i]
      const romaji = romajiMap.get(line.timeMs) ?? ''
      const tokens = await computeFuriganaForLine(line.text, romaji)
      if (tokens) furiganaData.push({ lineIndex: i, words: tokens })
    }
  }

  const resolvedFuriganaData = applyFuriganaOverrides(
    furiganaData,
    song.confirmedFuriganaTokenIds,
    song.furiganaOverrides,
  )
  const stageLyrics = await buildStageLyrics(
    lrcParsed,
    romajiMap,
    translationMap,
    resolvedFuriganaData,
    annotateJapanese,
  )
  return saveSong({
    ...song,
    furiganaData: resolvedFuriganaData,
    stageLyrics,
    furiganaVersion: FURIGANA_VERSION,
  })
}

export async function updateFuriganaToken(
  neteaseId: number,
  lineIndex: number,
  tokenIndex: number,
  newReading: string,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  const normalizedReading = wanakanaToHiragana(newReading.trim()).replace(/\s+/g, '')
  if (!normalizedReading || !/^[\u3040-\u309fー]+$/u.test(normalizedReading)) return null

  const furiganaData = (song.furiganaData ?? []).map((fl) => ({
    ...fl,
    words: [...fl.words],
  }))

  const targetLine = furiganaData.find((fl) => fl.lineIndex === lineIndex)
  if (!targetLine || tokenIndex >= targetLine.words.length) return null
  if (!targetLine.words[tokenIndex].isKanji) return null

  const tokenId = buildFuriganaTokenId(lineIndex, tokenIndex)
  const furiganaOverrides = {
    ...(song.furiganaOverrides ?? {}),
    [tokenId]: normalizedReading,
  }
  const confirmedFuriganaTokenIds = Array.from(new Set([
    ...(song.confirmedFuriganaTokenIds ?? []),
    tokenId,
  ]))

  targetLine.words[tokenIndex] = {
    ...targetLine.words[tokenIndex],
    reading: normalizedReading,
    confidence: 'high',
    source: 'user_confirmed',
  }

  const lrcParsed = song.lrcParsed ?? []
  const romajiMap = new Map(Object.entries(song.romajiLines ?? {}).map(([k, v]) => [Number(k), v]))
  const translationMap = new Map(Object.entries(song.translationLines ?? {}).map(([k, v]) => [Number(k), v]))
  const stageLyrics = await buildStageLyrics(lrcParsed, romajiMap, translationMap, furiganaData)

  return saveSong({
    ...song,
    furiganaData,
    stageLyrics,
    furiganaOverrides,
    confirmedFuriganaTokenIds,
  })
}

export async function confirmFuriganaToken(
  neteaseId: number,
  lineIndex: number,
  tokenIndex: number,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  const tokenId = buildFuriganaTokenId(lineIndex, tokenIndex)
  const confirmedFuriganaTokenIds = Array.from(new Set([
    ...(song.confirmedFuriganaTokenIds ?? []),
    tokenId,
  ]))

  const furiganaData = applyFuriganaOverrides(
    song.furiganaData ?? [],
    confirmedFuriganaTokenIds,
    song.furiganaOverrides,
  )
  return saveSong({ ...song, confirmedFuriganaTokenIds, furiganaData })
}

export async function ignoreMediumConfidenceLine(
  neteaseId: number,
  lineIndex: number,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  const ignoredMediumConfidenceLineIndexes = Array.from(new Set([
    ...(song.ignoredMediumConfidenceLineIndexes ?? []),
    lineIndex,
  ]))

  return saveSong({ ...song, ignoredMediumConfidenceLineIndexes })
}

export async function setIgnoreAllMediumConfidenceHints(
  neteaseId: number,
  ignored: boolean,
): Promise<Song | null> {
  const song = loadAll().find((s) => s.neteaseId === neteaseId)
  if (!song) return null

  return saveSong({
    ...song,
    ignoreAllMediumConfidenceHints: ignored,
  })
}
