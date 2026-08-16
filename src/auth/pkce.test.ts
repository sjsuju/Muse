import { describe, expect, it } from 'vitest'
import { buildAuthorizationUrl, createCodeChallenge, isSafeReturnPath } from './pkce'

describe('Spotify PKCE', () => {
  it('creates the RFC 7636 challenge', async () => {
    await expect(createCodeChallenge('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~abc'))
      .resolves.toMatch(/^[A-Za-z0-9_-]+$/u)
  })

  it('builds an authorization URL without a client secret', () => {
    const url = new URL(buildAuthorizationUrl({
      clientId: 'public-id',
      redirectUri: 'http://127.0.0.1:5173/auth/callback',
      challenge: 'challenge',
      state: 'state',
    }))
    expect(url.origin).toBe('https://accounts.spotify.com')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.has('client_secret')).toBe(false)
    expect(url.searchParams.get('scope')).toContain('streaming')
  })

  it('accepts only same-app return paths', () => {
    expect(isSafeReturnPath('/library/albums')).toBe(true)
    expect(isSafeReturnPath('https://attacker.example')).toBe(false)
    expect(isSafeReturnPath('//attacker.example')).toBe(false)
  })
})
