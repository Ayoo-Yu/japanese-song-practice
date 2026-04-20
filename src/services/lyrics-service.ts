import { getLyric, getSongUrl, getSongDetail } from '../lib/netease'
import { parseLrc } from '../lib/lrc-parser'
import { getSongByNeteaseId, saveSong, updateAudioUrl } from './song-service'
import type { Song, StageLine } from '../types'

export async function getAnnotatedSong(neteaseId: number): Promise<Song> {
  const cached = await getSongByNeteaseId(neteaseId)
  const hasGoodCache = cached?.stageLyrics
    && Object.keys(cached.stageLyrics).length === 5
    && cached.stageLyrics[1]?.some((l) => l.romaji)
    && cached.stageLyrics[3]?.some((l) => l.translation && l.translation.endsWith('…'))
  if (hasGoodCache) {
    // Fix missing metadata on cached songs
    if (!cached.title || !cached.artist) {
      const detail = await getSongDetail(neteaseId)
      if (detail) {
        const updated = { ...cached, title: detail.title, artist: detail.artist, album: detail.album, albumArtUrl: detail.albumArtUrl ?? cached.albumArtUrl }
        await saveSong(updated)
        return ensureAudioUrl(updated)
      }
    }
    return ensureAudioUrl(cached)
  }

  const { lrc, tlyric, romalrc } = await getLyric(neteaseId)
  const lrcRaw = lrc?.lyric ?? ''
  const parsedLines = parseLrc(lrcRaw)

  if (parsedLines.length === 0) {
    throw new Error('没有找到歌词')
  }

  // Parse translation and romaji from NetEase
  const translationMap = tlyric?.lyric
    ? new Map(parseLrc(tlyric.lyric).map((l) => [l.timeMs, l.text]))
    : new Map<number, string>()
  const romajiMap = romalrc?.lyric
    ? new Map(parseLrc(romalrc.lyric).map((l) => [l.timeMs, l.text]))
    : new Map<number, string>()

  // Pre-compute 5 stage versions:
  // 1: JP + romaji + full translation (maximum help)
  // 2: JP + full translation (reading practice)
  // 3: JP + partial translation hint (testing recall)
  // 4: JP only (raw reading)
  // 5: JP only, KTV style (performance)
  const stageLyrics: Record<number, StageLine[]> = {}
  for (let stage = 1; stage <= 5; stage++) {
    stageLyrics[stage] = parsedLines.map((line) => {
      const romaji = romajiMap.get(line.timeMs) ?? ''
      const translation = translationMap.get(line.timeMs) ?? ''

      let showRomaji = ''
      let showTranslation = ''

      if (stage === 1) {
        showRomaji = romaji
        showTranslation = translation
      } else if (stage === 2) {
        showTranslation = translation
      } else if (stage === 3) {
        // Show first 3 chars of translation as hint
        showTranslation = translation.length > 3 ? translation.slice(0, 3) + '…' : translation
      }
      // stage 4 & 5: nothing extra

      return {
        timeMs: line.timeMs,
        original: line.text,
        annotated: line.text,
        romaji: showRomaji,
        translation: showTranslation,
      }
    })
  }

  const songUrl = await getSongUrl(neteaseId)
  const base = cached ?? {}

  // Fetch metadata from NetEase if missing from cache
  let meta = { title: (base as Song).title ?? '', artist: (base as Song).artist ?? '', album: (base as Song).album, albumArtUrl: (base as Song).albumArtUrl }
  if (!meta.title || !meta.artist) {
    const detail = await getSongDetail(neteaseId)
    if (detail) {
      meta = { title: detail.title, artist: detail.artist, album: detail.album, albumArtUrl: detail.albumArtUrl ?? meta.albumArtUrl }
    }
  }

  const song: Song = {
    ...(base as Song),
    id: (base as Song).id ?? '',
    neteaseId,
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    albumArtUrl: meta.albumArtUrl,
    lrcRaw,
    lrcParsed: parsedLines,
    stageLyrics,
    translation: parsedLines.map((l) => translationMap.get(l.timeMs) ?? '').join('\n'),
    audioUrl: songUrl ?? (base as Song).audioUrl,
    audioUrlFetchedAt: songUrl ? new Date().toISOString() : (base as Song).audioUrlFetchedAt,
  }

  return saveSong(song)
}

export async function createSongFromSearch(result: {
  id: number
  name: string
  artists: { id: number; name: string }[]
  album: { id: number; name: string; picUrl?: string }
  duration: number
}): Promise<Song> {
  const existing = await getSongByNeteaseId(result.id)
  if (existing) return existing

  const song: Song = {
    id: '',
    neteaseId: result.id,
    title: result.name,
    artist: result.artists.map((a) => a.name).join(' / '),
    album: result.album.name,
    albumArtUrl: result.album.picUrl,
    durationMs: result.duration,
  }

  return saveSong(song)
}

export async function ensureAudioUrl(song: Song): Promise<Song> {
  if (!song.audioUrl || !song.audioUrlFetchedAt) {
    const url = await getSongUrl(song.neteaseId)
    if (url && song.id) {
      await updateAudioUrl(song.id, url)
      return { ...song, audioUrl: url, audioUrlFetchedAt: new Date().toISOString() }
    }
  }

  const fetchedAt = song.audioUrlFetchedAt ? new Date(song.audioUrlFetchedAt) : null
  const staleMs = 20 * 60 * 1000
  if (fetchedAt && Date.now() - fetchedAt.getTime() > staleMs) {
    const url = await getSongUrl(song.neteaseId)
    if (url && song.id) {
      await updateAudioUrl(song.id, url)
      return { ...song, audioUrl: url, audioUrlFetchedAt: new Date().toISOString() }
    }
  }

  return song
}
