import { describe, expect, it, vi } from 'vitest'
import { SpotifyApiClient, SpotifyFailure } from './api'

describe('SpotifyApiClient', () => {
  it('uses a refreshed token once after a 401', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(Response.json({ id: 'me' }))
    const getAccessToken = vi
      .fn<(refresh?: boolean) => Promise<string>>()
      .mockResolvedValueOnce('old-token')
      .mockResolvedValueOnce('new-token')
    const client = new SpotifyApiClient(getAccessToken, fetcher)

    await expect(client.request<{ id: string }>('/me')).resolves.toEqual({ id: 'me' })
    expect(getAccessToken).toHaveBeenLastCalledWith(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('classifies rate limits without exposing response bodies', async () => {
    const client = new SpotifyApiClient(
      async () => 'token',
      async () => new Response('private response', { status: 429, headers: { 'Retry-After': '9' } }),
    )

    await expect(client.request('/me')).rejects.toMatchObject({
      code: 'rate-limit',
      retryAfterSeconds: 9,
    } satisfies Partial<SpotifyFailure>)
  })

  it('reports a safe endpoint diagnostic for rejected API requests', async () => {
    const client = new SpotifyApiClient(
      async () => 'token',
      async () => new Response('private response', { status: 400 }),
    )

    await expect(client.request('/search?q=private-query&type=track')).rejects.toMatchObject({
      code: 'service',
      diagnostic: 'Spotify API returned HTTP 400 for /v1/search',
    } satisfies Partial<SpotifyFailure>)
  })

  it('preserves an HTTP status for bounded player recovery', async () => {
    const client = new SpotifyApiClient(
      async () => 'token',
      async () => new Response('', { status: 404 }),
    )

    await expect(client.request('/me/player/play')).rejects.toMatchObject({
      code: 'not-found',
      status: 404,
    } satisfies Partial<SpotifyFailure>)
  })

  it('keeps a safe diagnostic when the browser blocks the Spotify API request', async () => {
    const client = new SpotifyApiClient(
      async () => 'private-token',
      async () => { throw new TypeError('Failed to fetch') },
    )

    await expect(client.request('/me/albums?limit=8')).rejects.toMatchObject({
      code: 'network',
      diagnostic: expect.stringContaining('TypeError: Failed to fetch'),
    } satisfies Partial<SpotifyFailure>)
  })

  it('identifies an invalid browser fetch invocation without exposing request data', async () => {
    const client = new SpotifyApiClient(
      async () => 'private-token',
      async () => { throw new TypeError('Illegal invocation') },
    )

    await expect(client.request('/me')).rejects.toMatchObject({
      code: 'network',
      diagnostic: expect.stringContaining('TypeError: Illegal invocation'),
    } satisfies Partial<SpotifyFailure>)
  })

  it('invokes the browser fetch function without binding it to the API client', async () => {
    const browserFetch = function (this: unknown) {
      if (this !== undefined) throw new TypeError('Illegal invocation')
      return Promise.resolve(Response.json({ id: 'me' }))
    } as typeof fetch
    const client = new SpotifyApiClient(async () => 'token', browserFetch)

    await expect(client.request<{ id: string }>('/me')).resolves.toEqual({ id: 'me' })
  })
})
