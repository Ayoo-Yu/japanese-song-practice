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
  const loopRange = usePlayerStore((s) => s.loopRange)
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

  const syncCurrentTime = useCallback(() => {
    const audio = audioRef.current
    if (audio) setCurrentTime(audio.currentTime * 1000)
  }, [setCurrentTime])

  // Keep KTV lyrics responsive while avoiding a permanent 8ms global-store loop.
  useEffect(() => {
    if (!isPlaying) return

    let frameId = 0
    let lastSyncedAt = 0
    const tick = (timestamp: number) => {
      if (timestamp - lastSyncedAt >= 33) {
        syncCurrentTime()
        lastSyncedAt = timestamp
      }
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isPlaying, syncCurrentTime])

  // Audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handleEnded = () => setPlaying(false)
    const handleError = () => setPlaying(false)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onLoadedMetadata)
    audio.addEventListener('timeupdate', syncCurrentTime)
    audio.addEventListener('seeked', syncCurrentTime)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onLoadedMetadata)
      audio.removeEventListener('timeupdate', syncCurrentTime)
      audio.removeEventListener('seeked', syncCurrentTime)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
    }
  }, [onLoadedMetadata, setPlaying, syncCurrentTime])

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
    if (loopRange || playRangeEnd === null || !isPlaying) return
    if (currentTimeMs >= playRangeEnd) {
      setPlaying(false)
      setPlayRangeEnd(null)
    }
  }, [currentTimeMs, loopRange, playRangeEnd, isPlaying, setPlaying, setPlayRangeEnd])

  // Loop a short lyric range for deliberate line practice.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !loopRange || !isPlaying) return
    if (currentTimeMs >= loopRange.endMs) {
      audio.currentTime = loopRange.startMs / 1000
      setCurrentTime(loopRange.startMs)
    }
  }, [currentTimeMs, loopRange, isPlaying, setCurrentTime])

  return <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" preload="auto" />
}
