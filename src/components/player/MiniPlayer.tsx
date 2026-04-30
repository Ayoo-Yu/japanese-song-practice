import { Link } from 'react-router-dom'
import { usePlayerStore } from '../../stores/player-store'

export function MiniPlayer() {
  const nowPlaying = usePlayerStore((s) => s.nowPlaying)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const loopRange = usePlayerStore((s) => s.loopRange)
  const playbackRate = usePlayerStore((s) => s.playbackRate)

  if (!nowPlaying) return null

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0
  const statusText = loopRange
    ? '单句循环'
    : isPlaying
      ? '播放中'
      : '已暂停'

  return (
    <div className="fixed bottom-[4.5rem] inset-x-0 z-40">
      <div className="page-shell">
        <div className="mx-2 rounded-t-lg border border-b-0 border-border/60 bg-surface/94 px-3 py-2 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link
              to={`/song/${nowPlaying.neteaseId}`}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              {nowPlaying.albumArtUrl ? (
                <img
                  src={nowPlaying.albumArtUrl}
                  alt={nowPlaying.title}
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-xs font-bold text-text-muted">
                  音
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${isPlaying ? 'bg-success' : 'bg-text-muted'}`} />
                  <p className="truncate text-sm font-semibold text-text">{nowPlaying.title}</p>
                </div>
                <p className="truncate text-xs text-text-secondary">{nowPlaying.artist}</p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-[11px] font-semibold text-accent">{statusText}</p>
                <p className="text-[11px] tabular-nums text-text-muted">
                  {formatTime(currentTimeMs)} / {formatTime(durationMs)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlaying(!isPlaying)}
                aria-label={isPlaying ? '暂停' : '播放'}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition-transform active:scale-90"
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
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 sm:hidden">
            <p className="text-[11px] font-semibold text-accent">{statusText}</p>
            <p className="text-[11px] tabular-nums text-text-muted">
              {formatTime(currentTimeMs)} / {formatTime(durationMs)}
            </p>
          </div>
          {(loopRange || playbackRate !== 1) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {loopRange && (
                <span className="rounded-full bg-accent-bg px-2 py-0.5 text-[11px] font-semibold text-accent">
                  单句循环
                </span>
              )}
              {playbackRate !== 1 && (
                <span className="rounded-full bg-highlight px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                  {playbackRate === 0.5 ? '超慢' : playbackRate === 0.75 ? '慢速' : `${playbackRate}x`}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="mx-2 h-[2px] overflow-hidden rounded-full bg-border/30 -mt-px">
          <div
            className="h-full bg-accent/70 transition-all duration-300"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
