import { describe, expect, it, vi } from 'vitest'
import { SpotifyFailure } from '../spotify/api'
import { createDeviceActivator, retryPlayerCommand } from './activateDevice'

describe('Spotify playback device activation', () => {
  it('transfers playback to a device once before player commands', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const activate = createDeviceActivator(request)

    await activate('device-1')
    await activate('device-1')

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith('/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: ['device-1'], play: false }),
    })

    activate.reset()
    await activate('device-1')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('reactivates once when Spotify loses the device', async () => {
    const command = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new SpotifyFailure('not-found', 'missing device', undefined, undefined, 404))
      .mockResolvedValueOnce('playing')
    const reactivate = vi.fn().mockResolvedValue(undefined)

    await expect(retryPlayerCommand(command, reactivate)).resolves.toBe('playing')
    expect(reactivate).toHaveBeenCalledOnce()
    expect(command).toHaveBeenCalledTimes(2)
  })
})
