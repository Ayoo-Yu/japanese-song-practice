import { useRef, useEffect, useCallback } from 'react'
import { usePlayerStore } from '../../stores/player-store'

export function GlobalAudio() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioSrc = usePlayerStore((s) => s.audioSrc)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const volume = usePlayerStore((s) => s.volume)
  const playbackRate = usePlayerStore((s) => s.playbackRate)
  const pendingSeekMs = usePlayerStore((s) => s.pendingSeekMs)
  const playRangeEnd = usePlayerStore((s) => s.playRangeEnd)
  const currentTimeMs = usePlayerStore((s) => s.currentTimeMs)
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setVocalEnergy = usePlayerStore((s) => s.setVocalEnergy)
  void setVocalEnergy
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const setPlayRangeEnd = usePlayerStore((s) => s.setPlayRangeEnd)

  const onLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio?.duration && isFinite(audio.duration)) {
      setDuration(audio.duration * 1000)
    }
  }, [setDuration])

  // Tick loop for time + vocal energy — runs once, reads src from DOM
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout>
    const tick = () => {
      const audio = audioRef.current
      if (audio) {
        setCurrentTime(audio.currentTime * 1000)
      }
      timerId = setTimeout(tick, 8)
    }
    timerId = setTimeout(tick, 8)
    return () => clearTimeout(timerId)
  }, [setCurrentTime])

  // Audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onLoadedMetadata)
    audio.addEventListener('ended', () => setPlaying(false))
    audio.addEventListener('error', () => setPlaying(false))
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onLoadedMetadata)
    }
  }, [onLoadedMetadata, setPlaying])

  // Play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, audioSrc, setPlaying])

  // Volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Playback rate
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Seek
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || pendingSeekMs === null) return
    audio.currentTime = pendingSeekMs / 1000
    setCurrentTime(pendingSeekMs)
    setPendingSeek(null)
    if (!isPlaying) setPlaying(true)
  }, [pendingSeekMs, setCurrentTime, setPendingSeek, setPlaying, isPlaying])

  // Auto-stop at range end
  useEffect(() => {
    if (playRangeEnd === null || !isPlaying) return
    if (currentTimeMs >= playRangeEnd) {
      setPlaying(false)
      setPlayRangeEnd(null)
    }
  }, [currentTimeMs, playRangeEnd, isPlaying, setPlaying, setPlayRangeEnd])

  return <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" preload="auto" />
}
