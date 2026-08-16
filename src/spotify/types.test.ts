import { describe, expect, it } from 'vitest'
import { compactSpotifyItems, playablePlaylistEntries, playablePlaylistTracks } from './types'
import type { SpotifyTrack } from './types'

describe('Spotify response normalization', () => {
  it('removes unavailable items before a library grid renders them', () => {
    const available = { id: 'available' }

    expect(compactSpotifyItems([available, null, undefined])).toEqual([available])
  })

  it('keeps only playable tracks from playlist detail entries', () => {
    const track = {
      id: 'track',
      uri: 'spotify:track:track',
      name: 'Track',
      duration_ms: 1000,
      artists: [],
      album: { id: 'album', uri: 'spotify:album:album', name: 'Album', images: [], artists: [] },
    } satisfies SpotifyTrack
    const blocked = { ...track, id: 'blocked', is_playable: false }

    expect(playablePlaylistTracks([null, { track: null }, { item: blocked }, { item: track }])).toEqual([track])
    expect(playablePlaylistEntries([null, { track: null }, { item: blocked }, { item: track }])).toEqual([
      { track, position: 3 },
    ])
  })
})
