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
})
