import type { NeteaseSearchResult } from '../../types'

interface SearchResultCardProps {
  song: NeteaseSearchResult
  onPreview: (song: NeteaseSearchResult) => void
  onAdd: (song: NeteaseSearchResult) => void
  isAdding?: boolean
  added?: boolean
}

export function SearchResultCard({ song, onPreview, onAdd, isAdding, added }: SearchResultCardProps) {
  const durationMin = Math.floor(song.duration / 60000)
  const durationSec = Math.floor((song.duration % 60000) / 1000)

  return (
    <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-alt transition-colors text-left">
      {song.album.picUrl ? (
        <img
          src={song.album.picUrl}
          alt={song.album.name}
          width={52}
          height={52}
          className="rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-[52px] h-[52px] rounded-lg bg-surface-muted flex items-center justify-center text-2xl shrink-0">
          🎵
        </div>
      )}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onPreview(song)}
      >
        <p className="text-text font-medium truncate">{song.name}</p>
        <p className="text-text-secondary text-sm truncate">
          {song.artists.map((a) => a.name).join(' / ')}
        </p>
        <p className="text-text-muted text-xs">
          {song.album.name} · {durationMin}:{durationSec.toString().padStart(2, '0')}
        </p>
      </div>
      <button
        onClick={() => onAdd(song)}
        disabled={isAdding || added}
        className={`px-4 py-2 rounded-lg text-sm font-medium shrink-0 transition-colors ${
          added
            ? 'bg-surface-muted text-text-muted'
            : 'bg-accent text-white hover:opacity-90 disabled:opacity-50'
        }`}
      >
        {isAdding ? '添加中...' : added ? '已添加' : '添加'}
      </button>
    </div>
  )
}
