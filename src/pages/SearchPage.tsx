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
    <div className="page-shell p-6">
      <div className="mb-6 rounded-lg bg-surface/68 backdrop-blur-sm px-4 py-3">
        <h2 className="text-2xl font-bold text-text">搜索歌曲</h2>
      </div>
      <SearchBar onSearch={handleSearch} isLoading={isLoading} defaultValue={cache.query} />

      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {results.map((song) => (
          <SearchResultCard
            key={song.id}
            song={song}
            onPreview={handlePreview}
            onAdd={handleAdd}
            isAdding={addingId === song.id}
            added={addedIds.has(song.id)}
          />
        ))}
      </div>
    </div>
  )
}
