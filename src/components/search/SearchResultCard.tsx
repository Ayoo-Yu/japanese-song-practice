import type { NeteaseSearchResult } from '../../types'

interface SearchResultCardProps {
  song: NeteaseSearchResult
  onSelect: (song: NeteaseSearchResult) => void
  isLoading?: boolean
}

export function SearchResultCard({ song, onSelect, isLoading }: SearchResultCardProps) {
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
      <div className="flex-1 min-w-0">
        <p className="text-text font-medium truncate">{song.name}</p>
        <p className="text-text-secondary text-sm truncate">
          {song.artists.map((a) => a.name).join(' / ')}
        </p>
        <p className="text-text-muted text-xs">
          {song.album.name} · {durationMin}:{durationSec.toString().padStart(2, '0')}
        </p>
      </div>
      <button
        onClick={() => onSelect(song)}
        disabled={isLoading}
        className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium shrink-0 disabled:opacity-50"
      >
        {isLoading ? '添加中...' : '添加'}
      </button>
    </div>
  )
}
