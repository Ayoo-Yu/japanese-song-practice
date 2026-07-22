import { getLyric, getSongUrl, getSongDetail } from '../lib/netease'
import { parseLrc } from '../lib/lrc-parser'
import { computeDisplayRomaji, computeFuriganaForLine, tokensToDisplayRomaji, tokensToHtml, FURIGANA_VERSION } from '../lib/furigana-service'
import { applyFuriganaOverrides } from '../lib/furigana-overrides'
import { shouldAnnotateJapaneseLyrics } from '../lib/lyrics-language'
import { getSongByNeteaseId, saveSong, updateAudioUrl } from './song-service'
import type { Song, StageLine, ParsedLine, FuriganaLine } from '../types'

export async function buildStageLyrics(
  parsedLines: ParsedLine[],
  romajiMap: Map<number, string>,
  translationMap: Map<number, string>,
  furiganaData?: FuriganaLine[],
  annotateJapanese = true,
): Promise<Record<number, StageLine[]>> {
  const furiganaByIndex = new Map<number, FuriganaLine>()
  if (furiganaData) {
    for (const fl of furiganaData) furiganaByIndex.set(fl.lineIndex, fl)
  }

  const displayRomajiByTime = new Map<number, string>()
  for (let idx = 0; idx < parsedLines.length; idx++) {
    const line = parsedLines[idx]
    const sourceRomaji = romajiMap.get(line.timeMs) ?? ''
    const words = furiganaByIndex.get(idx)?.words
    const displayRomaji = annotateJapanese
      ? words?.length
        ? tokensToDisplayRomaji(words)
        : await computeDisplayRomaji(line.text, sourceRomaji)
      : sourceRomaji.trim()
    displayRomajiByTime.set(line.timeMs, displayRomaji)
  }

  const stageLyrics: Record<number, StageLine[]> = {}
  for (let stage = 1; stage <= 5; stage++) {
    stageLyrics[stage] = parsedLines.map((line, idx) => {
      const romaji = displayRomajiByTime.get(line.timeMs) ?? ''
      const translation = translationMap.get(line.timeMs) ?? ''

      // Generate furigana HTML for annotated field
      const fLine = furiganaByIndex.get(idx)
      const annotated = fLine ? tokensToHtml(fLine.words) : line.text

      let showRomaji = ''
      let showTranslation = ''

      if (stage === 1) {
        showRomaji = romaji
        showTranslation = translation
      } else if (stage === 2) {
        showTranslation = translation
      } else if (stage === 3) {
        showTranslation = translation.length > 3 ? translation.slice(0, 3) + '…' : translation
      }

      return {
        timeMs: line.timeMs,
        original: line.text,
        annotated,
        romaji: showRomaji,
        translation: showTranslation,
      }
    })
  }
  return stageLyrics
}

export async function getAnnotatedSong(neteaseId: number, preview = false): Promise<Song> {
  const cached = await getSongByNeteaseId(neteaseId)
  const cachedNeedsJapaneseAnnotations = cached
    ? shouldAnnotateJapaneseLyrics(
        cached.lrcParsed ?? [],
        Object.values(cached.romajiLines ?? {}),
      )
    : true
  const cachedLineCount = cached?.lrcParsed?.length ?? 0
  const cachedStageLyrics = cached?.stageLyrics
  const hasCompleteStageLyrics = cachedStageLyrics
    && cachedLineCount > 0
    && [1, 2, 3, 4, 5].every(
      (stage) => cachedStageLyrics[stage]?.length === cachedLineCount,
    )
  const hasGoodCache = hasCompleteStageLyrics
    && cached.furiganaVersion === FURIGANA_VERSION
    && (
      !cachedNeedsJapaneseAnnotations
      || (
        cachedStageLyrics[1]?.some((l) => l.romaji)
        && cached.furiganaData
        && cached.furiganaData.length > 0
      )
    )
  if (hasGoodCache) {
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

  const translationMap = tlyric?.lyric
    ? new Map(parseLrc(tlyric.lyric).map((l) => [l.timeMs, l.text]))
    : new Map<number, string>()
  const romajiMap = romalrc?.lyric
    ? new Map(parseLrc(romalrc.lyric).map((l) => [l.timeMs, l.text]))
    : new Map<number, string>()
  const annotateJapanese = shouldAnnotateJapaneseLyrics(parsedLines, romajiMap.values())

  // Compute furigana for each line
  const furiganaData: FuriganaLine[] = []
  if (annotateJapanese) {
    for (let i = 0; i < parsedLines.length; i++) {
      const line = parsedLines[i]
      const romaji = romajiMap.get(line.timeMs) ?? ''
      const tokens = await computeFuriganaForLine(line.text, romaji)
      if (tokens) {
        furiganaData.push({ lineIndex: i, words: tokens })
      }
    }
  }

  const resolvedFuriganaData = applyFuriganaOverrides(
    furiganaData,
    cached?.confirmedFuriganaTokenIds,
    cached?.furiganaOverrides,
  )
  const stageLyrics = await buildStageLyrics(
    parsedLines,
    romajiMap,
    translationMap,
    resolvedFuriganaData,
    annotateJapanese,
  )

  // Build per-line source maps for editing
  const romajiLines: Record<number, string> = {}
  const translationLines: Record<number, string> = {}
  for (const line of parsedLines) {
    const r = stageLyrics[1]?.find((item) => item.timeMs === line.timeMs)?.romaji
    if (r) romajiLines[line.timeMs] = r
    const t = translationMap.get(line.timeMs)
    if (t) translationLines[line.timeMs] = t
  }

  // Audio availability must not prevent lyrics practice from opening. Keep a
  // cached source only when the refresh itself failed, not when the API
  // explicitly reports that this account cannot play the song.
  let songUrl: string | null | undefined
  try {
    songUrl = await getSongUrl(neteaseId)
  } catch {
    songUrl = undefined
  }
  const base = cached ?? {}

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
    furiganaData: resolvedFuriganaData,
    romajiLines,
    translationLines,
    translation: parsedLines.map((l) => translationMap.get(l.timeMs) ?? '').join('\n'),
    furiganaVersion: FURIGANA_VERSION,
    audioUrl: songUrl === undefined ? (base as Song).audioUrl : songUrl ?? undefined,
    audioUrlFetchedAt: songUrl
      ? new Date().toISOString()
      : songUrl === undefined ? (base as Song).audioUrlFetchedAt : undefined,
  }

  return preview ? song : saveSong(song)
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

export async function ensureAudioUrl(song: Song, force = false): Promise<Song> {
  const fetchedAt = song.audioUrlFetchedAt ? new Date(song.audioUrlFetchedAt) : null
  const staleMs = 20 * 60 * 1000
  const shouldRefresh = force
    || !song.audioUrl
    || !fetchedAt
    || Number.isNaN(fetchedAt.getTime())
    || Date.now() - fetchedAt.getTime() > staleMs

  if (shouldRefresh) {
    const url = await getSongUrl(song.neteaseId)
    if (song.id) {
      await updateAudioUrl(song.id, url ?? undefined)
    }
    if (url) {
      return { ...song, audioUrl: url, audioUrlFetchedAt: new Date().toISOString() }
    }
    return { ...song, audioUrl: undefined, audioUrlFetchedAt: undefined }
  }

  return song
}
