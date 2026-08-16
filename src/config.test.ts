import { describe, expect, it } from 'vitest'
import { getConfig } from './config'

describe('getConfig', () => {
  it('requires a Spotify client id', () => {
    expect(() => getConfig({})).toThrow('VITE_SPOTIFY_CLIENT_ID')
  })

  it('rejects browser configuration containing a client secret', () => {
    expect(() =>
      getConfig({
        VITE_SPOTIFY_CLIENT_ID: 'public-client-id',
        VITE_SPOTIFY_CLIENT_SECRET: 'must-not-ship',
      }),
    ).toThrow('client secret')
  })

  it('returns only the public client id and redirect uri', () => {
    expect(
      getConfig({
        VITE_SPOTIFY_CLIENT_ID: 'public-client-id',
        VITE_SPOTIFY_REDIRECT_URI: 'https://muse.example/auth/callback',
      }),
    ).toEqual({
      spotifyClientId: 'public-client-id',
      spotifyRedirectUri: 'https://muse.example/auth/callback',
    })
  })
})
