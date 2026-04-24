import { useRef, useEffect } from 'react'
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
  const setPendingSeek = usePlayerStore((s) => s.setPendingSeek)
  const setPlayRangeEnd = usePlayerStore((s) => s.setPlayRangeEnd)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration * 1000)
      }
    }

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
    } catch {}

    const BIN_LOW = 14
    const BIN_HIGH = 186
    const BIN_COUNT = BIN_HIGH - BIN_LOW

    let timerId: ReturnType<typeof setTimeout>
    const tick = () => {
      setCurrentTime(audio.currentTime * 1000)
      if (analyser && freqData) {
        analyser.getByteFrequencyData(freqData)
        let sum = 0
        for (let i = BIN_LOW; i < BIN_HIGH; i++) sum += freqData[i]
        setVocalEnergy(Math.min(100, sum / BIN_COUNT / 1.2))
      }
      timerId = setTimeout(tick, 8)
    }
    timerId = setTimeout(tick, 8)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('durationchange', onLoadedMetadata)
    audio.addEventListener('ended', () => setPlaying(false))
    audio.addEventListener('error', () => setPlaying(false))

    if (audio.duration && isFinite(audio.duration)) {
      setDuration(audio.duration * 1000)
    }

    return () => {
      clearTimeout(timerId)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('durationchange', onLoadedMetadata)
    }
  }, [audioSrc, setCurrentTime, setDuration, setPlaying, setVocalEnergy])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioSrc) return
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, audioSrc, setPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || pendingSeekMs === null) return
    audio.currentTime = pendingSeekMs / 1000
    setCurrentTime(pendingSeekMs)
    setPendingSeek(null)
    if (!isPlaying) setPlaying(true)
  }, [pendingSeekMs, setCurrentTime, setPendingSeek, setPlaying, isPlaying])

  useEffect(() => {
    if (playRangeEnd === null || !isPlaying) return
    if (currentTimeMs >= playRangeEnd) {
      setPlaying(false)
      setPlayRangeEnd(null)
    }
  }, [currentTimeMs, playRangeEnd, isPlaying, setPlaying, setPlayRangeEnd])

  if (!audioSrc) return null

  return <audio ref={audioRef} src={audioSrc} crossOrigin="anonymous" preload="auto" />
}
