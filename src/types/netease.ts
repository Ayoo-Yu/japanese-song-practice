export interface NeteaseSearchResult {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl?: string }
  duration: number
}

interface NeteaseRawSong {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl?: string; picId?: number }
  duration: number
  transNames?: string[]
}

export interface NeteaseSearchResponse {
  result: {
    songs: NeteaseRawSong[]
    songCount: number
  }
  code: number
}

export interface NeteaseLyricResponse {
  lrc: { lyric: string }
  tlyric?: { lyric: string }
  romalrc?: { lyric: string }
  code: number
}

export interface NeteaseSongUrlResponse {
  data: { url: string | null; br: number; code: number }[]
}
