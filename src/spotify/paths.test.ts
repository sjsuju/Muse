import { describe, expect, it } from 'vitest'
import { spotifySearchPath } from './paths'

describe('Spotify API paths', () => {
  it('uses the February 2026 search limit', () => {
    expect(spotifySearchPath('slow dance')).toBe(
      '/search?q=slow%20dance&type=track,album,playlist&limit=10',
    )
  })
})
