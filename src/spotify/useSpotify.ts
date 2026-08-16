import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SpotifyApiClient, SpotifyFailure } from './api'

export function useSpotifyClient(): SpotifyApiClient {
  const { getAccessToken } = useAuth()
  return useMemo(() => new SpotifyApiClient(getAccessToken), [getAccessToken])
}

export function useSpotifyData<T>(path: string | null) {
  const client = useSpotifyClient()
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(Boolean(path))
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!path) {
      setLoading(false)
      setData(null)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    client.request<T>(path, { signal: controller.signal }).then(setData).catch((error: unknown) => {
      if (controller.signal.aborted) return
      const failure = error instanceof SpotifyFailure ? error : new SpotifyFailure('service', 'Unexpected Spotify failure')
      navigate(`/failure/${failure.code}`, {
        state: {
          returnTo: location.pathname + location.search,
          ...(failure.retryAfterSeconds
            ? { retryAt: Date.now() + failure.retryAfterSeconds * 1000 }
            : {}),
          ...(failure.diagnostic ? { diagnostic: failure.diagnostic } : {}),
        },
      })
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [client, location.pathname, location.search, navigate, path, reloadKey])

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])
  return { data, loading, reload }
}
