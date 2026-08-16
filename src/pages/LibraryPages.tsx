import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass'
import { useDeferredValue, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { EmptyState, LoadingGrid } from '../components/AsyncState'
import { MediaCard } from '../components/MediaCard'
import { TrackList } from '../components/TrackList'
import { usePlayback } from '../playback/PlaybackProvider'
import type { SavedAlbum, SavedTrack, SearchResults, SpotifyAlbum, SpotifyPage, SpotifyPlaylist, SpotifyTrack } from '../spotify/types'
import { useSpotifyData } from '../spotify/useSpotify'

function PageHeader({ title, body }: { title: string; body: string }) {
  return <header className="page-header"><p className="eyebrow">Your collection</p><h1>{title}</h1><p>{body}</p></header>
}

function useSafePlayback() {
  const playback = usePlayback()
  const navigate = useNavigate()
  return {
    track: (uri: string) => void playback.playTrack(uri).catch(() => navigate('/failure/device')),
    context: (uri: string, offset?: string) => void playback.playContext(uri, offset).catch(() => navigate('/failure/device')),
  }
}

function AlbumGrid({ albums }: { albums: SpotifyAlbum[] }) {
  const play = useSafePlayback()
  return <div className="media-grid">{albums.map((album) => <MediaCard key={album.id} title={album.name} subtitle={album.artists.map((artist) => artist.name).join(', ')} image={album.images[0]?.url} to={`/album/${album.id}`} onPlay={() => play.context(album.uri)} />)}</div>
}

function PlaylistGrid({ playlists }: { playlists: SpotifyPlaylist[] }) {
  const play = useSafePlayback()
  return <div className="media-grid">{playlists.map((playlist) => <MediaCard key={playlist.id} title={playlist.name} subtitle={playlist.owner?.display_name || `${playlist.tracks.total} tracks`} image={playlist.images[0]?.url} to={`/playlist/${playlist.id}`} onPlay={() => play.context(playlist.uri)} />)}</div>
}

export function HomePage() {
  const albums = useSpotifyData<SpotifyPage<SavedAlbum>>('/me/albums?limit=8')
  const playlists = useSpotifyData<SpotifyPage<SpotifyPlaylist>>('/me/playlists?limit=8')
  return <div className="page"><PageHeader title="Albums for slow mornings." body="A quieter way into the music you already love." />
    <section className="collection-section"><div className="section-heading"><h2>Recently saved</h2><span>Albums</span></div>{albums.loading ? <LoadingGrid /> : albums.data?.items.length ? <AlbumGrid albums={albums.data.items.map((item) => item.album)} /> : <EmptyState title="No saved albums yet" body="Save an album in Spotify and it will appear here." />}</section>
    <section className="collection-section"><div className="section-heading"><h2>Your playlists</h2><span>Made and followed</span></div>{playlists.loading ? <LoadingGrid /> : playlists.data?.items.length ? <PlaylistGrid playlists={playlists.data.items} /> : <EmptyState title="No playlists yet" body="Create or follow a Spotify playlist to begin." />}</section>
  </div>
}

export function TracksPage() {
  const result = useSpotifyData<SpotifyPage<SavedTrack>>('/me/tracks?limit=50')
  const play = useSafePlayback()
  return <div className="page"><PageHeader title="Saved tracks" body="The songs you kept, in one place." />{result.loading ? <LoadingGrid /> : result.data?.items.length ? <TrackList tracks={result.data.items.map((item) => item.track)} onPlay={(track) => play.track(track.uri)} /> : <EmptyState title="No saved tracks" body="Use Spotify's save button and your tracks will collect here." />}</div>
}

export function AlbumsPage() {
  const result = useSpotifyData<SpotifyPage<SavedAlbum>>('/me/albums?limit=50')
  return <div className="page"><PageHeader title="Albums" body="Records you wanted to return to." />{result.loading ? <LoadingGrid /> : result.data?.items.length ? <AlbumGrid albums={result.data.items.map((item) => item.album)} /> : <EmptyState title="No saved albums" body="Save an album in Spotify and it will appear here." />}</div>
}

export function PlaylistsPage() {
  const result = useSpotifyData<SpotifyPage<SpotifyPlaylist>>('/me/playlists?limit=50')
  return <div className="page"><PageHeader title="Playlists" body="Collections made by you and people you follow." />{result.loading ? <LoadingGrid /> : result.data?.items.length ? <PlaylistGrid playlists={result.data.items} /> : <EmptyState title="No playlists" body="Create or follow a playlist in Spotify to begin." />}</div>
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim())
  const result = useSpotifyData<SearchResults>(deferred ? `/search?q=${encodeURIComponent(deferred)}&type=track,album,playlist&limit=12` : null)
  const play = useSafePlayback()
  const playlists = result.data?.playlists?.items.filter((item): item is SpotifyPlaylist => Boolean(item)) ?? []
  return <div className="page"><PageHeader title="Search Spotify" body="Find a track, album, or playlist." />
    <label className="search-field"><MagnifyingGlass /><span className="sr-only">Search Spotify</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you want to hear?" autoFocus /></label>
    {!deferred ? <EmptyState title="Start with a name" body="Try an artist, song, album, or playlist." /> : result.loading ? <LoadingGrid /> : <div className="search-results">
      {result.data?.tracks?.items.length ? <section><h2>Tracks</h2><TrackList tracks={result.data.tracks.items} onPlay={(track) => play.track(track.uri)} /></section> : null}
      {result.data?.albums?.items.length ? <section><h2>Albums</h2><AlbumGrid albums={result.data.albums.items} /></section> : null}
      {playlists.length ? <section><h2>Playlists</h2><PlaylistGrid playlists={playlists} /></section> : null}
      {!result.data?.tracks?.items.length && !result.data?.albums?.items.length && !playlists.length ? <EmptyState title="Nothing matched" body="Try a shorter or more specific search." /> : null}
    </div>}
  </div>
}

export function AlbumPage() {
  const { albumId } = useParams()
  const result = useSpotifyData<SpotifyAlbum>(albumId ? `/albums/${encodeURIComponent(albumId)}` : null)
  const play = useSafePlayback()
  if (result.loading || !result.data) return <div className="page"><LoadingGrid /></div>
  const album = result.data
  const tracks = (album.tracks?.items ?? []).map((track) => ({ ...track, album }))
  return <div className="page"><header className="detail-header">{album.images[0]?.url ? <img src={album.images[0].url} alt="" /> : null}<div><p className="eyebrow">Album</p><h1>{album.name}</h1><p>{album.artists.map((artist) => artist.name).join(', ')}</p><button className="primary-button" type="button" onClick={() => play.context(album.uri)}>Play album</button></div></header><TrackList tracks={tracks} onPlay={(track) => play.context(album.uri, track.uri)} /></div>
}

interface PlaylistDetail extends Omit<SpotifyPlaylist, 'tracks'> { tracks: SpotifyPage<{ track: SpotifyTrack | null }> }

export function PlaylistPage() {
  const { playlistId } = useParams()
  const result = useSpotifyData<PlaylistDetail>(playlistId ? `/playlists/${encodeURIComponent(playlistId)}` : null)
  const play = useSafePlayback()
  if (result.loading || !result.data) return <div className="page"><LoadingGrid /></div>
  const playlist = result.data
  const tracks = playlist.tracks.items.flatMap((item) => item.track ? [item.track] : [])
  return <div className="page"><header className="detail-header">{playlist.images[0]?.url ? <img src={playlist.images[0].url} alt="" /> : null}<div><p className="eyebrow">Playlist</p><h1>{playlist.name}</h1><p>{playlist.description || `${playlist.tracks.total} tracks`}</p><button className="primary-button" type="button" onClick={() => play.context(playlist.uri)}>Play playlist</button></div></header><TrackList tracks={tracks} onPlay={(track) => play.context(playlist.uri, track.uri)} /></div>
}
