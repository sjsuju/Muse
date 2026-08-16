import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotifyAlbum, SpotifyTrack } from '../spotify/types'
import { AlbumPage, PlaylistPage } from './LibraryPages'

const playback = vi.hoisted(() => ({
  playContext: vi.fn(() => Promise.resolve()),
  playTrack: vi.fn(() => Promise.resolve()),
}))
const useSpotifyData = vi.hoisted(() => vi.fn())

vi.mock('../playback/PlaybackProvider', () => ({ usePlayback: () => playback }))
vi.mock('../spotify/useSpotify', () => ({ useSpotifyData }))

const album: SpotifyAlbum = {
  id: 'album-1',
  uri: 'spotify:album:album-1',
  name: 'Detail album',
  images: [],
  artists: [{ name: 'Album artist' }],
}
const track: SpotifyTrack = {
  id: 'track-1',
  uri: 'spotify:track:track-1',
  name: 'Detail track',
  duration_ms: 180_000,
  artists: [{ name: 'Track artist' }],
  album,
}

function renderAlbumPage() {
  render(
    <MemoryRouter initialEntries={['/album/album-1']}>
      <Routes><Route path="/album/:albumId" element={<AlbumPage />} /></Routes>
    </MemoryRouter>,
  )
}

function renderPlaylistPage() {
  render(
    <MemoryRouter initialEntries={['/playlist/playlist-1']}>
      <Routes><Route path="/playlist/:playlistId" element={<PlaylistPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('detail-page playback', () => {
  beforeEach(() => {
    playback.playContext.mockClear()
    playback.playTrack.mockClear()
  })

  it('plays a selected album track directly', () => {
    useSpotifyData.mockReturnValue({
      data: { ...album, tracks: { items: [track], total: 1, next: null } },
      loading: false,
    })

    renderAlbumPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play Detail track' }))

    expect(playback.playTrack).toHaveBeenCalledWith(track.uri)
    expect(playback.playContext).not.toHaveBeenCalled()
  })

  it('keeps album header play as context playback', () => {
    useSpotifyData.mockReturnValue({
      data: { ...album, tracks: { items: [track], total: 1, next: null } },
      loading: false,
    })

    renderAlbumPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play album' }))

    expect(playback.playContext).toHaveBeenCalledWith(album.uri, undefined)
    expect(playback.playTrack).not.toHaveBeenCalled()
  })

  it('plays a selected playlist track directly', () => {
    useSpotifyData.mockReturnValue({
      data: {
        id: 'playlist-1',
        uri: 'spotify:playlist:playlist-1',
        name: 'Detail playlist',
        images: [],
        items: { items: [{ item: track }], total: 1, next: null },
      },
      loading: false,
    })

    renderPlaylistPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play Detail track' }))

    expect(playback.playTrack).toHaveBeenCalledWith(track.uri)
    expect(playback.playContext).not.toHaveBeenCalled()
  })

  it('keeps playlist header play as context playback', () => {
    const playlistUri = 'spotify:playlist:playlist-1'
    useSpotifyData.mockReturnValue({
      data: {
        id: 'playlist-1',
        uri: playlistUri,
        name: 'Detail playlist',
        images: [],
        items: { items: [{ item: track }], total: 1, next: null },
      },
      loading: false,
    })

    renderPlaylistPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play playlist' }))

    expect(playback.playContext).toHaveBeenCalledWith(playlistUri, undefined)
    expect(playback.playTrack).not.toHaveBeenCalled()
  })
})
