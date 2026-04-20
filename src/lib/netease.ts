import type { NeteaseSearchResponse, NeteaseLyricResponse, NeteaseSongUrlResponse, NeteaseSearchResult } from '../types'

const BASE_URL = '/api/netease'

export async function searchSongs(keywords: string, limit = 20): Promise<NeteaseSearchResult[]> {
  const url = `${BASE_URL}/search/get/web?s=${encodeURIComponent(keywords)}&type=1&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  const json: NeteaseSearchResponse = await res.json()

  const songs = (json.result?.songs ?? []).map((song) => ({
    id: song.id,
    name: song.name,
    artists: song.artists.map((a) => ({ id: a.id, name: a.name })),
    album: {
      id: song.album.id,
      name: song.album.name,
      picUrl: undefined as string | undefined,
    },
    duration: song.duration,
  }))

  // Fetch album art for each song in batch
  if (songs.length > 0) {
    const ids = songs.map((s) => s.id)
    try {
      const detailRes = await fetch(`${BASE_URL}/song/detail?id=${ids[0]}&ids=${encodeURIComponent(JSON.stringify(ids))}`)
      if (detailRes.ok) {
        const detailJson: { songs: { id: number; album: { picUrl?: string } }[] } = await detailRes.json()
        const picMap = new Map<number, string>()
        for (const s of detailJson.songs ?? []) {
          if (s.album?.picUrl) picMap.set(s.id, s.album.picUrl)
        }
        for (const song of songs) {
          const pic = picMap.get(song.id)
          if (pic) song.album.picUrl = `${pic}?param=300y300`
        }
      }
    } catch {
      // Album art is non-critical, skip
    }
  }

  return songs
}

export async function getSongDetail(neteaseId: number): Promise<{ title: string; artist: string; album: string; albumArtUrl?: string } | null> {
  const res = await fetch(`${BASE_URL}/song/detail?id=${neteaseId}&ids=%5B${neteaseId}%5D`)
  if (!res.ok) return null
  const json: { songs: { name: string; artists: { name: string }[]; album: { name: string; picUrl?: string } }[] } = await res.json()
  const s = json.songs?.[0]
  if (!s) return null
  return {
    title: s.name,
    artist: s.artists.map((a) => a.name).join(' / '),
    album: s.album.name,
    albumArtUrl: s.album.picUrl ? `${s.album.picUrl}?param=300y300` : undefined,
  }
}

export async function getLyric(neteaseId: number): Promise<NeteaseLyricResponse> {
  const res = await fetch(`${BASE_URL}/song/lyric?id=${neteaseId}&lv=1&tv=1&rv=1`)
  if (!res.ok) throw new Error(`Lyric fetch failed: ${res.status}`)
  return res.json()
}

export async function getSongUrl(neteaseId: number): Promise<string | null> {
  // Use local NeteaseCloudMusicApi via Vite proxy (handles VIP + auth cookie)
  try {
    const apiRes = await fetch(`/api/local/song/url/v1?id=${neteaseId}&level=exhigh`)
    if (apiRes.ok) {
      const apiJson: NeteaseSongUrlResponse = await apiRes.json()
      const rawUrl = apiJson.data?.[0]?.url ?? null
      if (rawUrl) return `/api/audio-proxy?url=${encodeURIComponent(rawUrl)}`
    }
  } catch { /* local API not running */ }

  // Fallback to direct API
  const res = await fetch(`${BASE_URL}/song/enhance/player/url?id=${neteaseId}&ids=%5B${neteaseId}%5D&br=320000`)
  if (!res.ok) throw new Error(`Song URL fetch failed: ${res.status}`)
  const json: NeteaseSongUrlResponse = await res.json()
  const rawUrl = json.data?.[0]?.url ?? null
  if (!rawUrl) return null
  return `/api/audio-proxy?url=${encodeURIComponent(rawUrl)}`
}
