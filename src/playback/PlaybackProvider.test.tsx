import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlaybackProvider, usePlayback } from './PlaybackProvider'
import { PlaylistPage } from '../pages/LibraryPages'
import type { SpotifyTrack } from '../spotify/types'
import { SpotifyFailure } from '../spotify/api'

const spotifyClient = vi.hoisted(() => ({ request: vi.fn() }))
const request = spotifyClient.request
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
vi.mock('../spotify/useSpotify', () => ({ useSpotifyData, useSpotifyClient: () => spotifyClient }))

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

const trackTwo: SpotifyTrack = {
  ...track,
  id: 'track-2',
  uri: 'spotify:track:track-2',
  name: 'Second track',
}

const trackThree: SpotifyTrack = {
  ...track,
  id: 'track-3',
  uri: 'spotify:track:track-3',
  name: 'Third track',
}

function PlaybackProbe() {
  const { error, ready, state } = usePlayback()
  const navigate = useNavigate()
  const currentTrackUri = state?.track_window?.current_track?.uri || ''
  return <>
    <output data-testid="sdk-ready">{String(ready)}</output>
    <output data-testid="current-track">{currentTrackUri}</output>
    <output data-testid="playback-error">{error ?? ''}</output>
    <button type="button" onClick={() => navigate('/library/tracks')}>Go to saved tracks</button>
  </>
}

function PlaybackCommandProbe() {
  const playback = usePlayback()
  return <>
    <button type="button" onClick={() => void playback.next()}>Next</button>
    <button type="button" onClick={() => void playback.previous()}>Previous</button>
    <button type="button" onClick={() => void (playback.playTrack as unknown as (uri: string, visibleUris: string[]) => Promise<void>)(trackTwo.uri, [track.uri, trackTwo.uri, trackThree.uri])}>Play selected</button>
  </>
}

function PlaybackContextProbe() {
  const playback = usePlayback()
  return <button type="button" onClick={() => void playback.playContext(
    'spotify:playlist:playlist-1',
    trackTwo.uri,
    [track.uri, trackTwo.uri, trackThree.uri],
    1,
  )}>Play context</button>
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
        items: { items: [{ item: track }, { item: trackTwo }], total: 2, next: null },
      },
      loading: false,
    })
    request.mockImplementation((path: string) => {
      if (path === '/me/player') return Promise.resolve(undefined)
      if (path.startsWith('/me/player/play')) return Promise.resolve(undefined)
      return Promise.resolve(undefined)
    })
  })

  it('sends playlist context with the original selected row position', async () => {
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
      expect.objectContaining({
        body: JSON.stringify({
          context_uri: 'spotify:playlist:playlist-1',
          offset: { position: 0 },
        }),
      }),
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
      expect.objectContaining({
        body: JSON.stringify({
          context_uri: 'spotify:playlist:playlist-1',
          offset: { position: 0 },
        }),
      }),
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

  it('rotates the selected track to the front of the visible URI queue', async () => {
    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <PlaybackProvider>
          <PlaybackCommandProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play selected' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/play?device_id=device-1',
      expect.objectContaining({
        body: JSON.stringify({ uris: [trackTwo.uri, trackThree.uri, track.uri] }),
      }),
    ))
    const playRequest = request.mock.calls.find(([path]) => path === '/me/player/play?device_id=device-1')
    expect(playRequest?.[1]).toEqual(expect.objectContaining({
      body: JSON.stringify({ uris: [trackTwo.uri, trackThree.uri, track.uri] }),
    }))
    expect(JSON.parse(playRequest?.[1]?.body)).not.toHaveProperty('offset')
  })

  it('starts a selected playlist row with context offset and falls back to the rotated queue after a 403', async () => {
    request.mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/me/player') return Promise.resolve(undefined)
      if (path.startsWith('/me/player/play') && init?.body && String(init.body).includes('context_uri')) {
        return Promise.reject(new SpotifyFailure('account', 'Context rejected', undefined, undefined, 403))
      }
      return Promise.resolve(undefined)
    })

    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <PlaybackProvider>
          <PlaybackContextProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play context' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/play?device_id=device-1',
      expect.objectContaining({
        body: JSON.stringify({
          context_uri: 'spotify:playlist:playlist-1',
          offset: { position: 1 },
        }),
      }),
    ))
    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/play?device_id=device-1',
      expect.objectContaining({
        body: JSON.stringify({ uris: [trackTwo.uri, trackThree.uri, track.uri] }),
      }),
    ))
  })

  it('uses the Spotify next and previous endpoints through the request client', async () => {
    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <PlaybackProvider>
          <PlaybackCommandProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/next?device_id=device-1',
      { method: 'POST' },
    ))
    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/previous?device_id=device-1',
      { method: 'POST' },
    ))
  })

  it('invalidates only the device reported not_ready and clears state on a null SDK snapshot', async () => {
    render(
      <MemoryRouter initialEntries={['/playlist/playlist-1']}>
        <PlaybackProvider>
          <PlaybackProbe />
          <PlaybackCommandProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    await waitFor(() => expect(screen.getByTestId('sdk-ready')).toHaveTextContent('true'))
    act(() => { sdkListeners.get('not_ready')?.({ device_id: 'device-1' }) })
    await waitFor(() => expect(screen.getByTestId('sdk-ready')).toHaveTextContent('false'))

    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-2' }) })
    await waitFor(() => expect(screen.getByTestId('sdk-ready')).toHaveTextContent('true'))
    act(() => { sdkListeners.get('not_ready')?.({ device_id: 'device-1' }) })
    expect(screen.getByTestId('sdk-ready')).toHaveTextContent('true')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(request).toHaveBeenCalledWith(
      '/me/player/next?device_id=device-2',
      { method: 'POST' },
    ))

    act(() => { sdkListeners.get('player_state_changed')?.({ track_window: { current_track: { uri: track.uri } } }) })
    await waitFor(() => expect(screen.getByTestId('current-track')).toHaveTextContent(track.uri))
    act(() => { sdkListeners.get('player_state_changed')?.(null) })
    await waitFor(() => expect(screen.getByTestId('current-track')).toBeEmptyDOMElement())
  })

  it('transfers playback again when the active SDK device reconnects', async () => {
    render(
      <MemoryRouter>
        <PlaybackProvider>
          <PlaybackCommandProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('ready')).toBe(true))
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play selected' }))
    await waitFor(() => expect(request.mock.calls.filter(([path]) => path === '/me/player')).toHaveLength(1))

    act(() => { sdkListeners.get('not_ready')?.({ device_id: 'device-1' }) })
    act(() => { sdkListeners.get('ready')?.({ device_id: 'device-1' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Play selected' }))

    await waitFor(() => expect(request.mock.calls.filter(([path]) => path === '/me/player')).toHaveLength(2))
  })

  it('clears a transient SDK error when valid playback state arrives', async () => {
    render(
      <MemoryRouter>
        <PlaybackProvider>
          <PlaybackProbe />
        </PlaybackProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(sdkListeners.has('playback_error')).toBe(true))
    act(() => { sdkListeners.get('playback_error')?.({ message: 'Playback error' }) })
    await waitFor(() => expect(screen.getByTestId('playback-error')).toHaveTextContent('Playback error'))

    act(() => { sdkListeners.get('player_state_changed')?.({ track_window: { current_track: { uri: track.uri } } }) })
    await waitFor(() => expect(screen.getByTestId('playback-error')).toBeEmptyDOMElement())
  })
})
