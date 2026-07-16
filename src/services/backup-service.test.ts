import { beforeEach, describe, expect, it } from 'vitest'
import { createBackupJson, restoreBackupJson } from './backup-service'
import { SONGS_STORAGE_KEY } from './song-service'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

describe('backup service', () => {
  it('round-trips known application data', () => {
    localStorage.setItem(SONGS_STORAGE_KEY, JSON.stringify([{ id: 'song-1' }]))
    const backup = createBackupJson()
    localStorage.clear()
    const result = restoreBackupJson(backup)

    expect(result.restoredKeys).toBe(1)
    expect(JSON.parse(localStorage.getItem(SONGS_STORAGE_KEY) ?? '[]')).toEqual([{ id: 'song-1' }])
  })

  it('rejects unrelated JSON', () => {
    expect(() => restoreBackupJson('{"data":{}}')).toThrow('格式或版本')
  })
})
