import { describe, expect, it } from 'vitest'
import { createDeviceGate } from './deviceGate'

describe('Spotify playback device gate', () => {
  it('waits for Spotify to provide a device id', async () => {
    const gate = createDeviceGate(1000)
    const pending = gate.wait()

    gate.ready('device-1')

    await expect(pending).resolves.toBe('device-1')
    gate.dispose()
  })
})
