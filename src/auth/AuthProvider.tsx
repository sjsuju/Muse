import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { AppConfig } from '../config'
import { buildAuthorizationUrl, createCodeChallenge, createRandomString, isSafeReturnPath } from './pkce'
import { exchangeAuthorizationCode, refreshSpotifySession } from './session'
import type { SpotifySession } from './session'

const SESSION_KEY = 'muse.spotify.session'
const PKCE_KEY = 'muse.spotify.pkce'

type AuthStatus = 'anonymous' | 'authenticated'

interface AuthContextValue {
  status: AuthStatus
  signIn: (returnTo?: string) => Promise<void>
  completeSignIn: (code: string, state: string) => Promise<string>
  signOut: () => void
  getAccessToken: (forceRefresh?: boolean) => Promise<string>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadSession(): SpotifySession | null {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    return value ? (JSON.parse(value) as SpotifySession) : null
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ config, children }: { config: AppConfig; children: ReactNode }) {
  const [session, setSession] = useState<SpotifySession | null>(loadSession)
  const refreshPromise = useRef<Promise<SpotifySession> | null>(null)

  const saveSession = useCallback((next: SpotifySession | null) => {
    setSession(next)
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  }, [])

  const signIn = useCallback(async (returnTo = '/') => {
    const verifier = createRandomString(72)
    const state = createRandomString(32)
    const challenge = await createCodeChallenge(verifier)
    sessionStorage.setItem(
      PKCE_KEY,
      JSON.stringify({ verifier, state, returnTo: isSafeReturnPath(returnTo) ? returnTo : '/' }),
    )
    window.location.assign(
      buildAuthorizationUrl({
        clientId: config.spotifyClientId,
        redirectUri: config.spotifyRedirectUri,
        challenge,
        state,
      }),
    )
  }, [config])

  const completeSignIn = useCallback(async (code: string, returnedState: string) => {
    const raw = sessionStorage.getItem(PKCE_KEY)
    sessionStorage.removeItem(PKCE_KEY)
    if (!raw) throw new Error('Missing PKCE session')
    const pending = JSON.parse(raw) as { verifier?: string; state?: string; returnTo?: string }
    if (!pending.verifier || pending.state !== returnedState) throw new Error('Invalid OAuth state')
    const next = await exchangeAuthorizationCode({
      code,
      verifier: pending.verifier,
      clientId: config.spotifyClientId,
      redirectUri: config.spotifyRedirectUri,
    })
    saveSession(next)
    return isSafeReturnPath(pending.returnTo) ? pending.returnTo : '/'
  }, [config, saveSession])

  const getAccessToken = useCallback(async (forceRefresh = false) => {
    if (!session) throw new Error('Spotify session is unavailable')
    if (!forceRefresh && session.expiresAt > Date.now() + 60_000) return session.accessToken
    if (!refreshPromise.current) {
      refreshPromise.current = refreshSpotifySession({
        refreshToken: session.refreshToken,
        clientId: config.spotifyClientId,
      }).then((next) => {
        saveSession(next)
        return next
      }).catch((error: unknown) => {
        saveSession(null)
        throw error
      }).finally(() => {
        refreshPromise.current = null
      })
    }
    return (await refreshPromise.current).accessToken
  }, [config.spotifyClientId, saveSession, session])

  const signOut = useCallback(() => saveSession(null), [saveSession])
  const value = useMemo<AuthContextValue>(() => ({
    status: session ? 'authenticated' : 'anonymous',
    signIn,
    completeSignIn,
    signOut,
    getAccessToken,
  }), [completeSignIn, getAccessToken, session, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
