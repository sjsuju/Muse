import { describe, expect, it, vi } from 'vitest'
import { runPlaybackAction } from './playbackAction'

describe('nonfatal playback actions', () => {
  it('reports a rejected command without rethrowing it', async () => {
    const report = vi.fn()

    await expect(runPlaybackAction(
      async () => { throw new Error('Track is unavailable') },
      report,
    )).resolves.toBe(false)
    expect(report).toHaveBeenLastCalledWith('Track is unavailable')
  })
})
