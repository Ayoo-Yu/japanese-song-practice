import { beforeEach, describe, expect, it } from 'vitest'
import { getSongByNeteaseId, saveSong, saveSongMv } from './song-service'
import type { BilibiliMv } from '../types'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}

describe('song MV persistence', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MemoryStorage(),
      configurable: true,
    })
  })

  it('removes an MV assignment without removing the song', async () => {
    await saveSong({
      id: '',
      neteaseId: 123,
      title: 'Test song',
      artist: 'Test artist',
    })
    const mv: BilibiliMv = {
      provider: 'bilibili',
      bvid: 'BV1B7411m7LV',
      page: 1,
      sourceUrl: 'https://www.bilibili.com/video/BV1B7411m7LV',
    }

    await saveSongMv(123, mv)
    expect((await getSongByNeteaseId(123))?.mv).toEqual(mv)

    await saveSongMv(123, undefined)
    const remainingSong = await getSongByNeteaseId(123)
    expect(remainingSong).not.toBeNull()
    expect(remainingSong?.mv).toBeUndefined()
  })
})
