import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchSongs } from '../lib/netease'
import { createSongFromSearch } from '../services/lyrics-service'
import { SearchBar } from '../components/search/SearchBar'
import { SearchResultCard } from '../components/search/SearchResultCard'
import type { NeteaseSearchResult } from '../types'

export function SearchPage() {
  const [results, setResults] = useState<NeteaseSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)
  const navigate = useNavigate()

  const handleSearch = async (query: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const songs = await searchSongs(query)
      setResults(songs)
      if (songs.length === 0) setError('没有找到相关歌曲')
    } catch {
      setError('搜索失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdd = async (song: NeteaseSearchResult) => {
    setAddingId(song.id)
    setError(null)
    try {
      await createSongFromSearch(song)
      navigate(`/song/${song.id}`)
    } catch {
      setError('添加歌曲失败')
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-text mb-6">搜索歌曲</h2>
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />

      {error && <p className="mt-4 text-danger text-sm">{error}</p>}

      <div className="mt-6 flex flex-col gap-3">
        {results.map((song) => (
          <SearchResultCard
            key={song.id}
            song={song}
            onSelect={handleAdd}
            isLoading={addingId === song.id}
          />
        ))}
      </div>
    </div>
  )
}
