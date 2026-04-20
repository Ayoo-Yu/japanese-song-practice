import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listUserSongs, deleteSong } from '../services/song-service'
import type { Song } from '../types'

export function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([])
  const [managing, setManaging] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const reload = () => listUserSongs().then(setSongs)

  useEffect(() => { reload() }, [])

  const handleDelete = async (id: string) => {
    await deleteSong(id)
    setConfirmId(null)
    reload()
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text">我的曲库</h2>
        {songs.length > 0 && (
          <button
            onClick={() => { setManaging(!managing); setConfirmId(null) }}
            className={`text-sm font-medium px-3 py-1 rounded-lg transition-colors ${
              managing
                ? 'bg-red-500/10 text-red-500'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            {managing ? '完成' : '管理'}
          </button>
        )}
      </div>

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
            <div key={song.id} className="relative">
              <Link
                to={`/song/${song.neteaseId}`}
                className={`flex items-center gap-4 p-4 rounded-xl bg-surface-alt hover:bg-surface-muted transition-colors ${
                  managing ? 'pr-14' : ''
                }`}
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

              {managing && (
                confirmId === song.id ? (
                  <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pr-1">
                    <button
                      onClick={() => handleDelete(song.id)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg"
                    >
                      删除
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-2.5 py-1.5 text-xs font-medium bg-surface text-text-secondary rounded-lg"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(song.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
