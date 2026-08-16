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

  it('serializes concurrent activation requests for different device ids', async () => {
    let releaseFirst!: () => void
    const firstRequest = new Promise<void>((resolve) => { releaseFirst = resolve })
    const request = vi.fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(undefined)
    const activate = createDeviceActivator(request)

    const firstActivation = activate('device-1')
    const secondActivation = activate('device-2')
    await Promise.resolve()
    expect(request).toHaveBeenCalledTimes(1)

    releaseFirst()
    await Promise.all([firstActivation, secondActivation])

    expect(request).toHaveBeenNthCalledWith(2, '/me/player', {
      method: 'PUT',
      body: JSON.stringify({ device_ids: ['device-2'], play: false }),
    })
    await activate('device-2')
    expect(request).toHaveBeenCalledTimes(2)
  })
})
