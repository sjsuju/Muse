import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SpotifyAlbum, SpotifyTrack } from '../spotify/types'
import { AlbumPage, PlaylistPage, SearchPage, TracksPage } from './LibraryPages'

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
const nextTrack: SpotifyTrack = {
  ...track,
  id: 'track-2',
  uri: 'spotify:track:track-2',
  name: 'Next detail track',
}
const unplayableTrack: SpotifyTrack = {
  ...track,
  id: 'track-unplayable',
  uri: 'spotify:track:track-unplayable',
  name: 'Unavailable track',
  is_playable: false,
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

function renderTracksPage() {
  render(
    <MemoryRouter>
      <Routes><Route path="*" element={<TracksPage />} /></Routes>
    </MemoryRouter>,
  )
}

function renderSearchPage() {
  render(
    <MemoryRouter>
      <Routes><Route path="*" element={<SearchPage />} /></Routes>
    </MemoryRouter>,
  )
}

describe('detail-page playback', () => {
  beforeEach(() => {
    playback.playContext.mockClear()
    playback.playTrack.mockClear()
  })

  it('plays a selected album track in its visible album context', () => {
    useSpotifyData.mockReturnValue({
      data: { ...album, tracks: { items: [track, nextTrack], total: 2, next: null } },
      loading: false,
    })

    renderAlbumPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play Detail track' }))

    expect(playback.playContext).toHaveBeenCalledWith(album.uri, track.uri, [track.uri, nextTrack.uri])
    expect(playback.playTrack).not.toHaveBeenCalled()
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

  it('plays a selected playlist track at its original playlist position', () => {
    const playlistUri = 'spotify:playlist:playlist-1'
    useSpotifyData.mockReturnValue({
      data: {
        id: 'playlist-1',
        uri: playlistUri,
        name: 'Detail playlist',
        images: [],
        items: { items: [null, { item: unplayableTrack }, { item: track }], total: 3, next: null },
      },
      loading: false,
    })

    renderPlaylistPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play Detail track' }))

    expect(playback.playContext).toHaveBeenCalledWith(playlistUri, track.uri, [track.uri], 2)
    expect(playback.playTrack).not.toHaveBeenCalled()
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

  it('plays a selected saved track with only visible playable track URIs', () => {
    useSpotifyData.mockReturnValue({
      data: {
        items: [{ added_at: '2026-01-01T00:00:00Z', track }, { added_at: '2026-01-02T00:00:00Z', track: unplayableTrack }],
        total: 2,
        next: null,
      },
      loading: false,
    })

    renderTracksPage()
    fireEvent.click(screen.getByRole('button', { name: 'Play Detail track' }))

    expect(playback.playTrack).toHaveBeenCalledWith(track.uri, [track.uri])
    expect(playback.playContext).not.toHaveBeenCalled()
  })

  it('plays a selected search track with only visible playable track URIs', async () => {
    useSpotifyData.mockReturnValue({
      data: {
        tracks: { items: [track, unplayableTrack], total: 2, next: null },
      },
      loading: false,
    })

    renderSearchPage()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search Spotify' }), { target: { value: 'detail' } })
    fireEvent.click(await screen.findByRole('button', { name: 'Play Detail track' }))

    expect(playback.playTrack).toHaveBeenCalledWith(track.uri, [track.uri])
    expect(playback.playContext).not.toHaveBeenCalled()
  })
})
