import { useState, useEffect } from 'react'
import { initKuroshiro } from '../lib/kuroshiro'

export function useKuroshiro() {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    initKuroshiro()
      .then(() => {
        if (!cancelled) setIsReady(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return { isReady, isLoading, error }
}
