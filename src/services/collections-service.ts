import type { SavedLine, SavedWord } from '../types'

export const SAVED_WORDS_STORAGE_KEY = 'jpsong_saved_words'
export const SAVED_LINES_STORAGE_KEY = 'jpsong_saved_lines'

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T[] : []
  } catch {
    return []
  }
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items))
}

export async function listSavedWords(): Promise<SavedWord[]> {
  return load<SavedWord>(SAVED_WORDS_STORAGE_KEY).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function listSavedLines(): Promise<SavedLine[]> {
  return load<SavedLine>(SAVED_LINES_STORAGE_KEY).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function toggleSavedWord(word: Omit<SavedWord, 'savedAt'>): Promise<boolean> {
  const items = load<SavedWord>(SAVED_WORDS_STORAGE_KEY)
  const existingIndex = items.findIndex((item) => item.id === word.id)
  if (existingIndex >= 0) {
    items.splice(existingIndex, 1)
    save(SAVED_WORDS_STORAGE_KEY, items)
    return false
  }
  items.push({ ...word, savedAt: new Date().toISOString() })
  save(SAVED_WORDS_STORAGE_KEY, items)
  return true
}

export async function toggleSavedLine(line: Omit<SavedLine, 'savedAt'>): Promise<boolean> {
  const items = load<SavedLine>(SAVED_LINES_STORAGE_KEY)
  const existingIndex = items.findIndex((item) => item.id === line.id)
  if (existingIndex >= 0) {
    items.splice(existingIndex, 1)
    save(SAVED_LINES_STORAGE_KEY, items)
    return false
  }
  items.push({ ...line, savedAt: new Date().toISOString() })
  save(SAVED_LINES_STORAGE_KEY, items)
  return true
}

export async function removeSavedWord(id: string): Promise<void> {
  const items = load<SavedWord>(SAVED_WORDS_STORAGE_KEY).filter((item) => item.id !== id)
  save(SAVED_WORDS_STORAGE_KEY, items)
}

export async function removeSavedLine(id: string): Promise<void> {
  const items = load<SavedLine>(SAVED_LINES_STORAGE_KEY).filter((item) => item.id !== id)
  save(SAVED_LINES_STORAGE_KEY, items)
}

export function removeCollectionsForSong(neteaseId: number): void {
  save(
    SAVED_WORDS_STORAGE_KEY,
    load<SavedWord>(SAVED_WORDS_STORAGE_KEY).filter((item) => item.neteaseId !== neteaseId),
  )
  save(
    SAVED_LINES_STORAGE_KEY,
    load<SavedLine>(SAVED_LINES_STORAGE_KEY).filter((item) => item.neteaseId !== neteaseId),
  )
}
