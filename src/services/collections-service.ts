import type { SavedLine, SavedWord } from '../types'

const WORDS_KEY = 'jpsong_saved_words'
const LINES_KEY = 'jpsong_saved_lines'

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
  return load<SavedWord>(WORDS_KEY).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function listSavedLines(): Promise<SavedLine[]> {
  return load<SavedLine>(LINES_KEY).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function toggleSavedWord(word: Omit<SavedWord, 'savedAt'>): Promise<boolean> {
  const items = load<SavedWord>(WORDS_KEY)
  const existingIndex = items.findIndex((item) => item.id === word.id)
  if (existingIndex >= 0) {
    items.splice(existingIndex, 1)
    save(WORDS_KEY, items)
    return false
  }
  items.push({ ...word, savedAt: new Date().toISOString() })
  save(WORDS_KEY, items)
  return true
}

export async function toggleSavedLine(line: Omit<SavedLine, 'savedAt'>): Promise<boolean> {
  const items = load<SavedLine>(LINES_KEY)
  const existingIndex = items.findIndex((item) => item.id === line.id)
  if (existingIndex >= 0) {
    items.splice(existingIndex, 1)
    save(LINES_KEY, items)
    return false
  }
  items.push({ ...line, savedAt: new Date().toISOString() })
  save(LINES_KEY, items)
  return true
}

export async function removeSavedWord(id: string): Promise<void> {
  const items = load<SavedWord>(WORDS_KEY).filter((item) => item.id !== id)
  save(WORDS_KEY, items)
}

export async function removeSavedLine(id: string): Promise<void> {
  const items = load<SavedLine>(LINES_KEY).filter((item) => item.id !== id)
  save(LINES_KEY, items)
}
