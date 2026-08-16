import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaybackProvider, usePlayback } from './PlaybackProvider'
import { PlaylistPage } from '../pages/LibraryPages'
import type { SpotifyTrack } from '../spotify/types'

const request = vi.hoisted(() => vi.fn())
const useSpotifyData = vi.hoisted(() => vi.fn())
const getAccessToken = vi.hoisted(() => vi.fn(() => Promise.resolve('token')))
const sdkListeners = vi.hoisted(() => new Map<string, (value?: unknown) => void>())
const player = vi.hoisted(() => ({
  activateElement: vi.fn(() => Promise.resolve()),
  addListener: vi.fn((event: string, listener: (value?: unknown) => void) => {
    sdkListeners.set(event, listener)
    return true
  }),
  connect: vi.fn(() => Promise.resolve(true)),
  disconnect: vi.fn(),
  removeListener: vi.fn(),
  nextTrack: vi.fn(() => Promise.resolve()),
  previousTrack: vi.fn(() => Promise.resolve()),
  seek: vi.fn(() => Promise.resolve()),
  setVolume: vi.fn(() => Promise.resolve()),
  togglePlay: vi.fn(() => Promise.resolve()),
}))

vi.mock('../auth/AuthProvider', () => ({ useAuth: () => ({ getAccessToken }) }))
vi.mock('../spotify/useSpotify', () => ({ useSpotifyData, useSpotifyClient: () => ({ request }) }))

const album = {
  id: 'album-1',
  uri: 'spotify:album:album-1',
  name: 'Album',
  images: [],
  artists: [{ name: 'Artist' }],
}
const track: SpotifyTrack = {
  id: 'track-1',
  uri: 'spotify:track:track-1',
  name: 'Playable track',
  duration_ms: 180_000,
  artists: [{ name: 'Artist' }],
  album,
}

function PlaybackProbe() {
  const { ready, state } = usePlayback()
  const navigate = useNavigate()
  const currentTrackUri = state?.track_window?.current_track?.uri || ''
  return <>
    <output data-testid="sdk-ready">{String(ready)}</output>
    <output data-testid="current-track">{currentTrackUri}</output>
    <button type="button" onClick={() => navigate('/library/tracks')}>Go to saved tracks</button>
  </>
}

describe('playlist playback shell regression', () => {
  beforeEach(() => {
    request.mockReset()
    useSpotifyData.mockReset()
    getAccessToken.mockClear()
    sdkListeners.clear()
    player.activateElement.mockClear()
    player.addListener.mockClear()
    player.connect.mockClear()
    player.disconnect.mockClear()
    player.removeListener.mockClear()
    player.nextTrack.mockClear()
    player.previousTrack.mockClear()
    player.seek.mockClear()
    player.setVolume.mockClear()
    player.togglePlay.mockClear()
    window.Spotify = { Player: vi.fn(function PlayerMock() { return player }) }
    useSpotifyData.mockReturnValue({
      data: {
        id: 'playlist-1',
        uri: 'spotify:playlist:playlist-1',
        name: 'Playlist',
        images: [],
        items: { items: [{ item: track }], total: 1, next: null },
      },
      loading: false,
    })
    request.mockImplementation((path: string) => {
      if (path === '/me/player') return Promise.resolve(undefined)
      if (path.startsWith('/me/player/play')) return Promise.resolve(undefined)
      return Promise.resolve(undefined)
    })
  })

  it('sends a playlist track URI while keeping the SDK shell mounted and out of fatal state', async () => {
    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <div data-testid="sdk-shell">
          <PlaybackProvider>
            <Routes>
              <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
              <Route path="/failure/*" element={<div>Fatal playback state</div>} />
            </Routes>
          </PlaybackProvider>
        </div>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play Playable track' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/play?device_id=device-1',
      expect.objectContaining({ body: JSON.stringify({ uris: [track.uri] }) }),
    ))
    act(() => { sdkListeners.get('playback_error')?.({ message: 'Track could not start' }) })
    await waitFor(() => expect(screen.queryByText('Fatal playback state')).not.toBeInTheDocument())
    expect(screen.getByTestId('sdk-shell')).toBeInTheDocument()
  })

  it('keeps the connected SDK and playback state when navigating to another library route', async () => {
    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <PlaybackProvider>
          <PlaybackProbe />
          <Routes>
            <Route path="/playlist/:playlistId" element={<PlaylistPage />} />
            <Route path="/library/tracks" element={<div>Saved tracks route</div>} />
          </Routes>
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play Playable track' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/play?device_id=device-1',
      expect.objectContaining({ body: JSON.stringify({ uris: [track.uri] }) }),
    ))
    act(() => { sdkListeners.get('player_state_changed')?.({
        track_window: { current_track: { uri: track.uri } },
      }) })
    await waitFor(() => expect(screen.getByTestId('current-track')).toHaveTextContent(track.uri))

    fireEvent.click(screen.getByRole('button', { name: 'Go to saved tracks' }))
    await waitFor(() => expect(screen.getByText('Saved tracks route')).toBeInTheDocument())

    expect(screen.getByTestId('sdk-ready')).toHaveTextContent('true')
    expect(screen.getByTestId('current-track')).toHaveTextContent(track.uri)
    expect(player.disconnect).not.toHaveBeenCalled()
    expect(player.connect).toHaveBeenCalledTimes(1)
  })
})
