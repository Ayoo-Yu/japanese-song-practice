import type { Song } from '../types'

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
