import { SpotifyFailure } from '../spotify/api'

function playbackErrorMessage(error: unknown): string {
  if (error instanceof SpotifyFailure) return error.diagnostic ?? error.message
  if (error instanceof Error) return error.message.slice(0, 160)
  return 'Spotify could not complete that playback command'
}

export async function runPlaybackAction(
  action: () => Promise<unknown>,
  report: (message: string | null) => void,
): Promise<boolean> {
  report(null)
  try {
    await action()
    return true
  } catch (error) {
    report(playbackErrorMessage(error))
    return false
  }
}
