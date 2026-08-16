import { SpotifyFailure } from '../spotify/api'

export interface SpotifySession {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface TokenResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
}

async function requestToken(
  body: URLSearchParams,
  fetcher: typeof fetch,
): Promise<TokenResponse> {
  let response: Response
  try {
    response = await fetcher('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    throw new SpotifyFailure('network', 'Spotify sign-in could not be reached')
  }
  if (!response.ok) throw new SpotifyFailure('auth', 'Spotify rejected the session request')
  return response.json() as Promise<TokenResponse>
}

export async function exchangeAuthorizationCode({
  code,
  verifier,
  clientId,
  redirectUri,
  fetcher = fetch,
  now = Date.now,
}: {
  code: string
  verifier: string
  clientId: string
  redirectUri: string
  fetcher?: typeof fetch
  now?: () => number
}): Promise<SpotifySession> {
  const token = await requestToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
    fetcher,
  )
  if (!token.access_token || !token.refresh_token || !token.expires_in) {
    throw new SpotifyFailure('auth', 'Spotify returned an incomplete session')
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: now() + token.expires_in * 1000,
  }
}

export async function refreshSpotifySession({
  refreshToken,
  clientId,
  fetcher = fetch,
  now = Date.now,
}: {
  refreshToken: string
  clientId: string
  fetcher?: typeof fetch
  now?: () => number
}): Promise<SpotifySession> {
  const token = await requestToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
    }),
    fetcher,
  )
  if (!token.access_token || !token.expires_in) {
    throw new SpotifyFailure('auth', 'Spotify returned an incomplete refresh response')
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || refreshToken,
    expiresAt: now() + token.expires_in * 1000,
  }
}
