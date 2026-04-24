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
    <div className="w-full flex items-center gap-4 p-4 rounded-xl bg-surface-alt/80 backdrop-blur-sm shadow-sm hover:shadow-md hover:bg-surface-alt transition-all duration-200 text-left border border-border/40">
      {song.album.picUrl ? (
        <img
          src={song.album.picUrl}
          alt={song.album.name}
          width={56}
          height={56}
          className="rounded-xl object-cover shrink-0 shadow-sm"
        />
      ) : (
        <div className="w-14 h-14 rounded-xl bg-surface-muted flex items-center justify-center text-2xl shrink-0">
          🎵
        </div>
      )}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onPreview(song)}
      >
        <p className="text-text font-semibold truncate">{song.name}</p>
        <p className="text-text-secondary text-sm truncate mt-0.5">
          {song.artists.map((a) => a.name).join(' / ')}
        </p>
        <p className="text-text-muted text-xs mt-0.5">
          {song.album.name} · {durationMin}:{durationSec.toString().padStart(2, '0')}
        </p>
      </div>
      <button
        onClick={() => onAdd(song)}
        disabled={isAdding || added}
        className={`px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all duration-200 ${
          added
            ? 'bg-surface-muted text-text-muted'
            : 'bg-accent text-white hover:brightness-110 active:scale-95 disabled:opacity-50'
        }`}
      >
        {isAdding ? '添加中...' : added ? '已添加' : '添加'}
      </button>
    </div>
  )
}
