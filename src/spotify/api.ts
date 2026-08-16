import type { FailureCode } from '../failures'

export class SpotifyFailure extends Error {
  constructor(
    public readonly code: FailureCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    public readonly diagnostic?: string,
    public readonly status?: number,
  ) {
    super(message)
    this.name = 'SpotifyFailure'
  }
}

function safeNetworkMessage(error: Error): string {
  const message = error.message
  if (/illegal invocation/i.test(message)) return 'Illegal invocation'
  if (/content security policy|\bcsp\b/i.test(message)) return 'Blocked by Content Security Policy'
  if (/cross-origin|access control|\bcors\b/i.test(message)) return 'Blocked by cross-origin policy'
  if (/failed to fetch|load failed|network(?:error| request failed)/i.test(message)) {
    return 'Failed to fetch'
  }
  const chromiumCode = message.match(/net::ERR_[A-Z_]+/)?.[0]
  return chromiumCode ?? 'Request failed before Spotify responded'
}

function networkDiagnostic(error: unknown): string {
  const name = error instanceof Error ? error.name : 'UnknownError'
  const message = error instanceof Error
    ? safeNetworkMessage(error)
    : 'Request failed before Spotify responded'
  const online = typeof navigator === 'undefined' ? 'unknown' : navigator.onLine ? 'yes' : 'no'
  return `Spotify API | online: ${online} | ${name}: ${message}`
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
    const fetcher = this.fetcher
    const requestUrl = path.startsWith('http') ? path : `https://api.spotify.com/v1${path}`

    try {
      response = await fetcher(
        requestUrl,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...init.headers,
          },
        },
      )
    } catch (error) {
      throw new SpotifyFailure(
        'network',
        'Spotify could not be reached',
        undefined,
        networkDiagnostic(error),
      )
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
      throw new SpotifyFailure(
        code,
        `Spotify request failed with status ${response.status}`,
        undefined,
        `Spotify API returned HTTP ${response.status} for ${new URL(requestUrl).pathname}`,
        response.status,
      )
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }
}
