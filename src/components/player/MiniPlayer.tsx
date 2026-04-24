import { Link } from 'react-router-dom'
import { usePlayerStore } from '../../stores/player-store'

export function MiniPlayer() {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const durationMs = usePlayerStore((s) => s.durationMs)

  if (!nowPlaying) return null

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0

  return (
    <div className="fixed bottom-16 inset-x-0 z-40">
      <div className="page-shell">
        <Link
          to={`/song/${nowPlaying.neteaseId}`}
          className="flex items-center gap-3 mx-1 px-3 py-2 rounded-t-xl bg-surface/90 backdrop-blur-md border border-border/50 border-b-0 shadow-lg"
        >
          {nowPlaying.albumArtUrl ? (
            <img
              src={nowPlaying.albumArtUrl}
              alt={nowPlaying.title}
              width={36}
              height={36}
              className="rounded-lg object-cover shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-surface-muted flex items-center justify-center text-sm shrink-0">
              🎵
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{nowPlaying.title}</p>
            <p className="text-xs text-text-secondary truncate">{nowPlaying.artist}</p>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setPlaying(!isPlaying)
            }}
            className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center shrink-0 active:scale-90 transition-transform"
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4 2.5v11l9-5.5z" />
              </svg>
            )}
          </button>
        </Link>
        <div className="mx-1 h-[2px] bg-border/30 rounded-full overflow-hidden -mt-px">
          <div
            className="h-full bg-accent/60 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
