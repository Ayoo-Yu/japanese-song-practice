import type { NeteaseSearchResult } from '../../types'

interface SearchResultCardProps {
  song: NeteaseSearchResult
  onPreview: (song: NeteaseSearchResult) => void
  onAdd: (song: NeteaseSearchResult) => void
  onStart: (song: NeteaseSearchResult) => void
  isAdding?: boolean
  added?: boolean
}

export function SearchResultCard({ song, onPreview, onAdd, onStart, isAdding, added }: SearchResultCardProps) {
  const durationMin = Math.floor(song.duration / 60000)
  const durationSec = Math.floor((song.duration % 60000) / 1000)

  return (
    <div className="learning-card w-full p-4 text-left">
      <div className="flex items-center gap-4">
        {song.album.picUrl ? (
          <img
            src={song.album.picUrl}
            alt={song.album.name}
            width={58}
            height={58}
            className="h-[58px] w-[58px] shrink-0 rounded-lg object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-lg bg-surface-muted text-lg font-bold text-text-muted">
            音
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-semibold text-accent">
              {added ? '已在曲库' : '可加入练习'}
            </span>
            <span className="text-[11px] text-text-muted">
              {durationMin}:{durationSec.toString().padStart(2, '0')}
            </span>
          </div>
          <p className="truncate font-semibold text-text">{song.name}</p>
          <p className="mt-0.5 truncate text-sm text-text-secondary">
            {song.artists.map((a) => a.name).join(' / ')}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{song.album.name}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onPreview(song)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          先预览
        </button>
        <button
          type="button"
          onClick={() => added ? onStart(song) : onAdd(song)}
          disabled={isAdding}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
            added
              ? 'bg-accent-bg text-accent hover:bg-accent/15'
              : 'bg-accent text-white hover:brightness-110 active:scale-95 disabled:opacity-50'
          }`}
        >
          {isAdding ? '添加中...' : added ? '开始跟唱' : '加入练习'}
        </button>
      </div>
    </div>
  )
}
