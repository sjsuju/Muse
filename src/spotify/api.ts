import type { FailureCode } from '../failures'

export class SpotifyFailure extends Error {
  constructor(
    public readonly code: FailureCode,
    message: string,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message)
    this.name = 'SpotifyFailure'
  }
}

type AccessTokenProvider = (refresh?: boolean) => Promise<string>

export class SpotifyApiClient {
  constructor(
    private readonly getAccessToken: AccessTokenProvider,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async request<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
    const token = await this.getAccessToken(retried)
    let response: Response

    try {
      response = await this.fetcher(
        path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers,
          },
        },
      )
    } catch {
      throw new SpotifyFailure('network', 'Spotify could not be reached')
    }

    if (response.status === 401 && !retried) {
      return this.request<T>(path, init, true)
    }
    if (response.status === 429) {
      const seconds = Number(response.headers.get('Retry-After') ?? 1)
      throw new SpotifyFailure('rate-limit', 'Spotify rate limit reached', seconds)
    }
    if (!response.ok) {
      const code: FailureCode =
        response.status === 403
          ? 'account'
          : response.status === 404
            ? 'not-found'
            : response.status >= 500
              ? 'service'
              : 'service'
      throw new SpotifyFailure(code, `Spotify request failed with status ${response.status}`)
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }
}
