import { useCallback } from 'react'
import { usePlayerStore } from '../../stores/player-store'

interface AudioPlayerProps {
  src?: string
  onRetry?: () => void
  isRetrying?: boolean
}

export function AudioPlayer({ src, onRetry, isRetrying }: AudioPlayerProps) {
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const playbackRate = usePlayerStore((s) => s.playbackRate)
  const setPlaybackRate = usePlayerStore((s) => s.setPlaybackRate)

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

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
      <div className="px-4 py-3 text-center">
        <p className="text-text-muted text-sm">暂无音频源（可能需要 VIP）</p>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="mt-2 px-4 py-1.5 rounded-full text-sm font-medium bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isRetrying ? '获取中...' : '重试获取音源'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="audio-player">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md"
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
        <span className="text-xs text-text-muted tabular-nums w-10 text-right">
          {formatTime(currentTimeMs)}
        </span>
        <input
          type="range"
          min={0}
          max={durationMs / 1000 || 0}
          step={0.1}
          value={currentTimeMs / 1000}
          onChange={handleSeek}
          className="flex-1 h-1.5 accent-accent"
          style={{
            background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-border) ${progress}%)`,
          }}
        />
        <span className="text-xs text-text-muted tabular-nums w-10">
          {formatTime(durationMs)}
        </span>
        <button
          onClick={() => {
            const idx = SPEEDS.indexOf(playbackRate)
            if (idx > 0) setPlaybackRate(SPEEDS[idx - 1])
          }}
          disabled={playbackRate === SPEEDS[0]}
          className="w-6 h-6 rounded text-xs font-bold bg-surface-alt text-text-secondary border border-border hover:border-accent disabled:opacity-30 shrink-0 flex items-center justify-center"
        >
          -
        </button>
        <span className="text-xs font-medium text-text-secondary tabular-nums w-8 text-center shrink-0">
          {playbackRate}x
        </span>
        <button
          onClick={() => {
            const idx = SPEEDS.indexOf(playbackRate)
            if (idx < SPEEDS.length - 1) setPlaybackRate(SPEEDS[idx + 1])
          }}
          disabled={playbackRate === SPEEDS[SPEEDS.length - 1]}
          className="w-6 h-6 rounded text-xs font-bold bg-surface-alt text-text-secondary border border-border hover:border-accent disabled:opacity-30 shrink-0 flex items-center justify-center"
        >
          +
        </button>
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
