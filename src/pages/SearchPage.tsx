import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchSongs } from '../lib/netease'
import { createSongFromSearch } from '../services/lyrics-service'
import { getSongByNeteaseId, listUserSongs } from '../services/song-service'
import { SearchBar } from '../components/search/SearchBar'
import { SearchResultCard } from '../components/search/SearchResultCard'
import { useSearchCache } from '../stores/search-cache-store'
import type { NeteaseSearchResult } from '../types'

export function SearchPage() {
  const cache = useSearchCache()
  const [results, setResults] = useState<NeteaseSearchResult[]>(cache.results)
  const [lastQuery, setLastQuery] = useState(cache.query)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const [addedIds, setAddedIds] = useState<Set<number>>(cache.addedIds)
  const navigate = useNavigate()

  useEffect(() => {
    listUserSongs().then((userSongs) => {
      const existingIds = new Set(userSongs.map((song) => song.neteaseId))
      setAddedIds((prev) => new Set([...prev, ...existingIds]))
    })
  }, [])

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)
    setLastQuery(query)
    try {
      const songs = await searchSongs(query)
      setResults(songs)
      const userSongs = await listUserSongs()
      const existingIds = new Set(userSongs.map((song) => song.neteaseId))
      const mergedAddedIds = new Set([...addedIds, ...existingIds])
      setAddedIds(mergedAddedIds)
      cache.setCache(query, songs, mergedAddedIds)
      if (songs.length === 0) setError('没有找到相关歌曲')
    } catch {
      setError('搜索失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePreview = (song: NeteaseSearchResult) => {
    cache.setCache(cache.query, results, addedIds)
    navigate(`/song/${song.id}?preview=1`)
  }

  const handleStart = (song: NeteaseSearchResult) => {
    cache.setCache(cache.query, results, addedIds)
    navigate(`/song/${song.id}`)
  }

  const handleAdd = async (song: NeteaseSearchResult) => {
    setAddingId(song.id)
    setError(null)
    try {
      const existing = await getSongByNeteaseId(song.id)
      if (existing) {
        setAddedIds((prev) => {
          const next = new Set(prev).add(song.id)
          cache.addId(song.id)
          return next
        })
        return
      }
      await createSongFromSearch(song)
      setAddedIds((prev) => {
        const next = new Set(prev).add(song.id)
        cache.addId(song.id)
        return next
      })
    } catch {
      setError('添加歌曲失败')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="page-shell px-4 py-6">
      <section className="learning-panel mb-5 px-5 py-5">
        <p className="mb-1 text-xs font-semibold uppercase text-accent">Find a song</p>
        <h2 className="text-2xl font-bold text-text">找一首想唱的日语歌</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          推荐从熟悉旋律开始，先跟着读音唱一句，再慢慢关掉辅助。
        </p>
      </section>
      <SearchBar onSearch={handleSearch} isLoading={isLoading} defaultValue={cache.query} />
      <div className="mt-3 flex flex-wrap gap-2">
        {['YOASOBI', 'Aimer', '米津玄師', 'アニメ'].map((keyword) => (
          <button
            key={keyword}
            type="button"
            onClick={() => handleSearch(keyword)}
            disabled={isLoading}
            className="rounded-full bg-surface/86 px-3 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-border transition-colors hover:text-accent disabled:opacity-50"
          >
            {keyword}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      {results.length === 0 && !error ? (
        <div className="learning-panel mt-5 px-5 py-10 text-center">
          <p className="font-semibold text-text">输入歌名或歌手</p>
          <p className="mt-2 text-sm text-text-secondary">比如动画歌、J-Pop 歌手，或你最近想学的一首歌。</p>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text">
              {lastQuery ? `“${lastQuery}”的结果` : '搜索结果'}
            </p>
            <p className="text-xs text-text-secondary">{results.length} 首</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {results.map((song) => (
              <SearchResultCard
                key={song.id}
                song={song}
                onPreview={handlePreview}
                onAdd={handleAdd}
                onStart={handleStart}
                isAdding={addingId === song.id}
                added={addedIds.has(song.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
