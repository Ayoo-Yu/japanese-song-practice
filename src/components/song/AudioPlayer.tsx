import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../../stores/player-store'

interface AudioPlayerProps {
  src?: string
}

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const durationMs = usePlayerStore((s) => s.durationMs)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setVocalEnergy = usePlayerStore((s) => s.setVocalEnergy)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration * 1000)
      }
    }
    const onEnded = () => setPlaying(false)
    const onError = () => setPlaying(false)

    // Web Audio API for vocal energy analysis
    let analyser: AnalyserNode | null = null
    let freqData: Uint8Array<ArrayBuffer> | null = null
    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
      analyser.connect(ctx.destination)
      freqData = new Uint8Array(analyser.frequencyBinCount)
    } catch {
      // CORS or unsupported — fall back to linear progress
    }

    // Vocal range: 300Hz–4kHz. At 44100Hz sample rate with fftSize 2048,
    // each bin ≈ 21.5Hz → bins 14–186
    const BIN_LOW = 14
    const BIN_HIGH = 186
    const BIN_COUNT = BIN_HIGH - BIN_LOW

    // 120fps time + energy updates
    let timerId: ReturnType<typeof setTimeout>
    const tick = () => {
      setCurrentTime(audio.currentTime * 1000)

      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData)
        let sum = 0
        for (let i = BIN_LOW; i < BIN_HIGH; i++) {
          sum += freqData[i]
        }
        // Normalize to 0–100
        setVocalEnergy(Math.min(100, sum / BIN_COUNT / 1.2))
      }

      timerId = setTimeout(tick, 8)
    }
    timerId = setTimeout(tick, 8)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration * 1000)
    }

    return () => {
      clearTimeout(timerId)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [src, setCurrentTime, setDuration, setPlaying, setVocalEnergy])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !src) return
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, src, setPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = volume
  }, [volume])

  useEffect(() => {
    setCurrentTime(0)
    setDuration(0)
    setPlaying(false)
  }, [src, setCurrentTime, setDuration, setPlaying])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current
      if (!audio) return
      const time = parseFloat(e.target.value)
      audio.currentTime = time
      setCurrentTime(time * 1000)
    },
    [setCurrentTime]
  )

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0

  if (!src) {
    return (
      <div className="px-4 py-3 text-center">
        <p className="text-text-muted text-sm">暂无音频源（可能需要 VIP）</p>
      </div>
    )
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} crossOrigin="anonymous" preload="auto" />
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(!isPlaying)}
          className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform"
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
