export interface AppConfig {
  spotifyClientId: string
  spotifyRedirectUri: string
}

type Environment = Record<string, string | boolean | undefined>

export function getConfig(environment: Environment = import.meta.env): AppConfig {
  const hasClientSecret = Object.entries(environment).some(
    ([key, value]) => key.includes('CLIENT_SECRET') && Boolean(value),
  )

  if (hasClientSecret) {
    throw new Error('A Spotify client secret must never be included in the PWA')
  }

  const spotifyClientId = String(environment.VITE_SPOTIFY_CLIENT_ID ?? '').trim()
  if (!spotifyClientId) {
    throw new Error('VITE_SPOTIFY_CLIENT_ID is required')
  }

  const fallbackOrigin =
    typeof window === 'undefined' ? 'http://127.0.0.1:5173' : window.location.origin

  return {
    spotifyClientId,
    spotifyRedirectUri:
      String(environment.VITE_SPOTIFY_REDIRECT_URI ?? '').trim() ||
      `${fallbackOrigin}/auth/callback`,
  }
}
