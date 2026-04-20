import { useState, useEffect } from 'react'
import { getAnnotatedSong } from '../services/lyrics-service'
import type { Song } from '../types'

export function useAnnotatedSong(neteaseId: number | null) {
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!neteaseId) return

    let cancelled = false
    setIsLoading(true)
    setError(null)

    getAnnotatedSong(neteaseId)
      .then((result) => {
        if (!cancelled) setSong(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load song')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [neteaseId])

  return { song, isLoading, error }
}
