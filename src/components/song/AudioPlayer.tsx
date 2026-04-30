import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { usePlayerStore } from '../../stores/player-store'

interface AudioPlayerProps {
  src?: string
  onRetry?: () => void
  isRetrying?: boolean
  onPlayRequest?: () => boolean | void
}

export function AudioPlayer({ src, onRetry, isRetrying, onPlayRequest }: AudioPlayerProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const playbackRate = usePlayerStore((s) => s.playbackRate)
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate)

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      setPendingSeek(time * 1000)
    },
    [setPendingSeek],
  )

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0

  if (!src) {
    return (
      <div className="rounded-lg border border-warning/25 bg-warning/10 px-4 py-3">
        <p className="text-sm font-semibold text-text">暂时没有拿到音源</p>
        <p className="mt-1 text-xs leading-5 text-text-secondary">
          你仍然可以看歌词、读假名和收藏句子；如果要跟原曲唱，先重试或登录音乐账号。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              disabled={isRetrying}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isRetrying ? '获取中...' : '重试音源'}
            </button>
          )}
          <Link
            to="/settings"
            className="rounded-lg bg-surface px-4 py-2 text-sm font-semibold text-text-secondary ring-1 ring-border"
          >
            去登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="audio-player rounded-lg border border-border/60 bg-surface/76 p-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            if (isPlaying) {
              setPlaying(false)
              return
            }
            const handled = onPlayRequest?.()
            if (handled) return
            setPlaying(true)
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5z" />
            </svg>
          )}
        </button>
        <span className="w-10 text-right text-xs tabular-nums text-text-muted">
          {formatTime(currentTimeMs)}
        </span>
        <input
          type="range"
          min={0}
          max={durationMs / 1000 || 0}
          step={0.1}
          value={currentTimeMs / 1000}
          onChange={handleSeek}
          className="h-1.5 min-w-0 flex-1 accent-accent"
          style={{
            background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-border) ${progress}%)`,
          }}
        />
        <span className="w-10 text-xs tabular-nums text-text-muted">
          {formatTime(durationMs)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold text-text-muted">跟唱速度</span>
        <div className="flex flex-wrap gap-2">
          <SpeedButton active={playbackRate === 0.5} onClick={() => setPlaybackRate(0.5)}>
            超慢
          </SpeedButton>
          <SpeedButton active={playbackRate === 0.75} onClick={() => setPlaybackRate(0.75)}>
            慢速
          </SpeedButton>
          <SpeedButton active={playbackRate === 1} onClick={() => setPlaybackRate(1)}>
            原速
          </SpeedButton>
        </div>
      </div>
    </div>
  )
}
function SpeedButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-accent bg-accent text-white'
          : 'border-border bg-surface-alt text-text-secondary hover:border-accent'
      }`}
    >
      {children}
    </button>
  )
}

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
