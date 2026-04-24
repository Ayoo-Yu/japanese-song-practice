import { useCallback, useRef } from 'react'

export function useSpeech() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const speak = useCallback((text: string) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    const audio = new Audio(`/api/tts?q=${encodeURIComponent(text)}&spd=2`)
    audioRef.current = audio
    audio.play().catch(() => {})
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
  }, [])

  return { speak, stop }
}
