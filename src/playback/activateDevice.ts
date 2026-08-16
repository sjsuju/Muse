import { SpotifyFailure } from '../spotify/api'

type SpotifyRequest = (path: string, init: RequestInit) => Promise<unknown>

export async function retryPlayerCommand<T>(
  command: () => Promise<T>,
  reactivate: () => Promise<unknown>,
): Promise<T> {
  try {
    return await command()
  } catch (error) {
    if (!(error instanceof SpotifyFailure) || error.status !== 404) throw error
    await reactivate()
    return command()
  }
}

export function createDeviceActivator(request: SpotifyRequest) {
  let activeDeviceId: string | null = null
  let activation = Promise.resolve()

  const activate = (deviceId: string): Promise<void> => {
    const nextActivation = activation.then(async () => {
      if (activeDeviceId === deviceId) return
      await request('/me/player', {
        method: 'PUT',
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      })
      activeDeviceId = deviceId
    })
    activation = nextActivation.catch(() => undefined)
    return nextActivation
  }
  activate.reset = () => {
    activeDeviceId = null
  }
  return activate
}
