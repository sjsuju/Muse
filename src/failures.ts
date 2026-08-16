export const FAILURE_CODES = [
  'auth',
  'account',
  'device',
  'network',
  'rate-limit',
  'service',
  'browser',
  'not-found',
] as const

export type FailureCode = (typeof FAILURE_CODES)[number]

export interface FailureState {
  returnTo: string
  retryAt?: number
  correlationId?: string
  diagnostic?: string
}

export interface FailureDefinition {
  code: FailureCode
  title: string
  issue: string
  actionLabel: string
}

const DEFINITIONS: Record<FailureCode, FailureDefinition> = {
  auth: {
    code: 'auth',
    title: 'Sign-in did not finish',
    issue: 'Spotify could not confirm this session. Access may have been denied or expired.',
    actionLabel: 'Sign in again',
  },
  account: {
    code: 'account',
    title: 'Premium access is required',
    issue: 'Browser playback needs an active Spotify Premium account with playback access.',
    actionLabel: 'Check account',
  },
  device: {
    code: 'device',
    title: 'Player device is unavailable',
    issue: 'Spotify could not activate this browser as a playback device.',
    actionLabel: 'Try player again',
  },
  network: {
    code: 'network',
    title: 'Spotify is out of reach',
    issue: 'The network is offline or Spotify did not answer in time.',
    actionLabel: 'Retry connection',
  },
  'rate-limit': {
    code: 'rate-limit',
    title: 'Spotify needs a moment',
    issue: 'Too many requests reached Spotify. Retrying early will extend the wait.',
    actionLabel: 'Retry when ready',
  },
  service: {
    code: 'service',
    title: 'Spotify service is unavailable',
    issue: 'The Spotify API or browser playback service could not initialize.',
    actionLabel: 'Try again',
  },
  browser: {
    code: 'browser',
    title: 'This browser is missing a feature',
    issue: 'Secure storage, media playback, or service-worker support is unavailable.',
    actionLabel: 'Check browser',
  },
  'not-found': {
    code: 'not-found',
    title: 'That page was not found',
    issue: 'The requested Muse page or Spotify item does not exist.',
    actionLabel: 'Return to library',
  },
}

export function isFailureCode(value: string): value is FailureCode {
  return FAILURE_CODES.includes(value as FailureCode)
}

export function getFailureDefinition(code: string | undefined): FailureDefinition {
  return DEFINITIONS[code && isFailureCode(code) ? code : 'not-found']
}

export function safeFailureState(value: Partial<FailureState> | null | undefined): FailureState {
  const returnTo = value?.returnTo
  return {
    returnTo: returnTo?.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/',
    ...(typeof value?.retryAt === 'number' ? { retryAt: value.retryAt } : {}),
    ...(value?.correlationId ? { correlationId: value.correlationId.slice(0, 64) } : {}),
    ...(value?.diagnostic ? { diagnostic: value.diagnostic.slice(0, 160) } : {}),
  }
}
