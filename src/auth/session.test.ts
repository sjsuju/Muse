import { describe, expect, it, vi } from 'vitest'
import { exchangeAuthorizationCode, refreshSpotifySession } from './session'

describe('Spotify session exchange', () => {
  it('exchanges a code through PKCE without a secret', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_token: 'access',
        refresh_token: 'refresh',
        expires_in: 3600,
        token_type: 'Bearer',
      }),
    )
    const session = await exchangeAuthorizationCode({
      code: 'code',
      verifier: 'verifier',
      clientId: 'public-id',
      redirectUri: 'http://127.0.0.1:5173/auth/callback',
      fetcher,
      now: () => 1000,
    })

    expect(session).toMatchObject({ accessToken: 'access', refreshToken: 'refresh', expiresAt: 3601000 })
    const body = String(fetcher.mock.calls[0][1]?.body)
    expect(body).toContain('code_verifier=verifier')
    expect(body).not.toContain('client_secret')
  })

  it('keeps the current refresh token when Spotify does not rotate it', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ access_token: 'new-access', expires_in: 3600, token_type: 'Bearer' }),
    )
    const session = await refreshSpotifySession({
      refreshToken: 'current-refresh',
      clientId: 'public-id',
      fetcher,
      now: () => 2000,
    })
    expect(session.refreshToken).toBe('current-refresh')
  })
})
