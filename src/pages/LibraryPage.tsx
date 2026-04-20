import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listUserSongs } from '../services/song-service'
import type { Song } from '../types'

export function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])

  useEffect(() => {
    listUserSongs().then(setSongs)
  }, [])

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-text mb-6">我的曲库</h2>

      {songs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted mb-4">还没有添加歌曲</p>
          <Link
            to="/search"
            className="inline-block px-6 py-2.5 bg-accent text-white rounded-xl font-medium"
          >
            去搜索添加
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {songs.map((song) => (
            <Link
              key={song.id}
              to={`/song/${song.neteaseId}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-alt hover:bg-surface-muted transition-colors"
            >
              {song.albumArtUrl ? (
                <img
                  src={song.albumArtUrl}
                  alt={song.album ?? song.title}
                  width={52}
                  height={52}
                  className="rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-[52px] h-[52px] rounded-lg bg-surface-muted flex items-center justify-center text-2xl shrink-0">
                  🎵
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-text font-medium truncate">{song.title}</p>
                <p className="text-text-secondary text-sm truncate">{song.artist}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
