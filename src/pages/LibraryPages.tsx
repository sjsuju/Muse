import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass'
import { useDeferredValue, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, LoadingGrid } from '../components/AsyncState'
import { MediaCard } from '../components/MediaCard'
import { TrackList } from '../components/TrackList'
import { usePlayback } from '../playback/PlaybackProvider'
import { compactSpotifyItems, playablePlaylistEntries } from '../spotify/types'
import type { SavedAlbum, SavedTrack, SearchResults, SpotifyAlbum, SpotifyPage, SpotifyPlaylist, SpotifyTrack } from '../spotify/types'
import { useSpotifyData } from '../spotify/useSpotify'
import { spotifySearchPath } from '../spotify/paths'

function PageHeader({ title, body }: { title: string; body: string }) {
  return <header className="page-header"><p className="eyebrow">Your collection</p><h1>{title}</h1><p>{body}</p></header>
}

function useSafePlayback() {
  const playback = usePlayback()
  const navigate = useNavigate()
  const location = useLocation()
  const handleFailure = (error: unknown) => navigate('/failure/device', {
    state: {
      returnTo: location.pathname + location.search,
      diagnostic: error instanceof Error ? error.message : 'Spotify playback could not start',
    },
  })
  return {
    track: (uri: string, visibleUris?: string[]) => void playback.playTrack(uri, visibleUris).catch(handleFailure),
    context: (uri: string, offset?: string, visibleUris?: string[], offsetPosition?: number) => void (
      offsetPosition !== undefined
        ? playback.playContext(uri, offset, visibleUris, offsetPosition)
        : visibleUris
          ? playback.playContext(uri, offset, visibleUris)
          : playback.playContext(uri, offset)
    ).catch(handleFailure),
  }
}

function AlbumGrid({ albums }: { albums: SpotifyAlbum[] }) {
  const play = useSafePlayback()
  return <div className="media-grid">{albums.map((album) => <MediaCard key={album.id} title={album.name} subtitle={album.artists?.map((artist) => artist.name).join(', ') || 'Album'} image={album.images?.[0]?.url} to={`/album/${album.id}`} onPlay={() => play.context(album.uri)} />)}</div>
}

function PlaylistGrid({ playlists }: { playlists: SpotifyPlaylist[] }) {
  const play = useSafePlayback()
  return <div className="media-grid">{playlists.map((playlist) => <MediaCard key={playlist.id} title={playlist.name} subtitle={playlist.owner?.display_name || `${playlist.items?.total ?? playlist.tracks?.total ?? 0} tracks`} image={playlist.images?.[0]?.url} to={`/playlist/${playlist.id}`} onPlay={() => play.context(playlist.uri)} />)}</div>
}

export function HomePage() {
  const albums = useSpotifyData<SpotifyPage<SavedAlbum | null>>('/me/albums?limit=8')
  const playlists = useSpotifyData<SpotifyPage<SpotifyPlaylist | null>>('/me/playlists?limit=8')
  const savedAlbums = compactSpotifyItems(albums.data?.items).flatMap((item) => compactSpotifyItems([item.album]))
  const savedPlaylists = compactSpotifyItems(playlists.data?.items)
  return <div className="page"><PageHeader title="Albums for slow mornings." body="A quieter way into the music you already love." />
    <section className="collection-section"><div className="section-heading"><h2>Recently saved</h2><span>Albums</span></div>{albums.loading ? <LoadingGrid /> : savedAlbums.length ? <AlbumGrid albums={savedAlbums} /> : <EmptyState title="No saved albums yet" body="Save an album in Spotify and it will appear here." />}</section>
    <section className="collection-section"><div className="section-heading"><h2>Your playlists</h2><span>Made and followed</span></div>{playlists.loading ? <LoadingGrid /> : savedPlaylists.length ? <PlaylistGrid playlists={savedPlaylists} /> : <EmptyState title="No playlists yet" body="Create or follow a Spotify playlist to begin." />}</section>
  </div>
}

export function TracksPage() {
  const result = useSpotifyData<SpotifyPage<SavedTrack | null>>('/me/tracks?limit=50')
  const play = useSafePlayback()
  const tracks = compactSpotifyItems(result.data?.items).flatMap((item) => compactSpotifyItems([item.track])).filter((track) => track.is_playable !== false)
  const visibleUris = tracks.map((track) => track.uri)
  return <div className="page"><PageHeader title="Saved tracks" body="The songs you kept, in one place." />{result.loading ? <LoadingGrid /> : tracks.length ? <TrackList tracks={tracks} onPlay={(track) => play.track(track.uri, visibleUris)} /> : <EmptyState title="No saved tracks" body="Use Spotify's save button and your tracks will collect here." />}</div>
}

export function AlbumsPage() {
  const result = useSpotifyData<SpotifyPage<SavedAlbum | null>>('/me/albums?limit=50')
  const albums = compactSpotifyItems(result.data?.items).flatMap((item) => compactSpotifyItems([item.album]))
  return <div className="page"><PageHeader title="Albums" body="Records you wanted to return to." />{result.loading ? <LoadingGrid /> : albums.length ? <AlbumGrid albums={albums} /> : <EmptyState title="No saved albums" body="Save an album in Spotify and it will appear here." />}</div>
}

export function PlaylistsPage() {
  const result = useSpotifyData<SpotifyPage<SpotifyPlaylist | null>>('/me/playlists?limit=50')
  const playlists = compactSpotifyItems(result.data?.items)
  return <div className="page"><PageHeader title="Playlists" body="Collections made by you and people you follow." />{result.loading ? <LoadingGrid /> : playlists.length ? <PlaylistGrid playlists={playlists} /> : <EmptyState title="No playlists" body="Create or follow a playlist in Spotify to begin." />}</div>
}

export function SearchPage() {
  const [query, setQuery] = useState('')
  const deferred = useDeferredValue(query.trim())
  const result = useSpotifyData<SearchResults>(deferred ? spotifySearchPath(deferred) : null)
  const play = useSafePlayback()
  const tracks = compactSpotifyItems(result.data?.tracks?.items).filter((track) => track.is_playable !== false)
  const visibleUris = tracks.map((track) => track.uri)
  const albums = compactSpotifyItems(result.data?.albums?.items)
  const playlists = compactSpotifyItems(result.data?.playlists?.items)
  return <div className="page"><PageHeader title="Search Spotify" body="Find a track, album, or playlist." />
    <label className="search-field"><MagnifyingGlass /><span className="sr-only">Search Spotify</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What do you want to hear?" autoFocus /></label>
    {!deferred ? <EmptyState title="Start with a name" body="Try an artist, song, album, or playlist." /> : result.loading ? <LoadingGrid /> : <div className="search-results">
      {tracks.length ? <section><h2>Tracks</h2><TrackList tracks={tracks} onPlay={(track) => play.track(track.uri, visibleUris)} /></section> : null}
      {albums.length ? <section><h2>Albums</h2><AlbumGrid albums={albums} /></section> : null}
      {playlists.length ? <section><h2>Playlists</h2><PlaylistGrid playlists={playlists} /></section> : null}
      {!tracks.length && !albums.length && !playlists.length ? <EmptyState title="Nothing matched" body="Try a shorter or more specific search." /> : null}
    </div>}
  </div>
}

export function AlbumPage() {
  const { albumId } = useParams()
  const result = useSpotifyData<SpotifyAlbum>(albumId ? `/albums/${encodeURIComponent(albumId)}` : null)
  const play = useSafePlayback()
  if (result.loading || !result.data) return <div className="page"><LoadingGrid /></div>
  const album = result.data
  const tracks = (album.tracks?.items ?? []).filter((track) => track.is_playable !== false).map((track) => ({ ...track, album }))
  const visibleUris = tracks.map((track) => track.uri)
  return <div className="page"><header className="detail-header">{album.images[0]?.url ? <img src={album.images[0].url} alt="" /> : null}<div><p className="eyebrow">Album</p><h1>{album.name}</h1><p>{album.artists.map((artist) => artist.name).join(', ')}</p><button className="primary-button" type="button" onClick={() => play.context(album.uri)}>Play album</button></div></header><TrackList tracks={tracks} onPlay={(track) => play.context(album.uri, track.uri, visibleUris)} /></div>
}

interface PlaylistDetail extends Omit<SpotifyPlaylist, 'items' | 'tracks'> {
  items?: SpotifyPage<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null> | null
  tracks?: SpotifyPage<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null> | null
}

export function PlaylistPage() {
  const { playlistId } = useParams()
  const result = useSpotifyData<PlaylistDetail>(playlistId ? `/playlists/${encodeURIComponent(playlistId)}` : null)
  const play = useSafePlayback()
  if (result.loading || !result.data) return <div className="page"><LoadingGrid /></div>
  const playlist = result.data
  const playlistItems = playlist.items ?? playlist.tracks
  const trackEntries = playablePlaylistEntries(playlistItems?.items)
  const tracks = trackEntries.map((entry) => entry.track)
  const visibleUris = tracks.map((track) => track.uri)
  const image = playlist.images?.[0]?.url
  return <div className="page"><header className="detail-header">{image ? <img src={image} alt="" /> : null}<div><p className="eyebrow">Playlist</p><h1>{playlist.name}</h1><p>{playlist.description || `${playlistItems?.total ?? tracks.length} tracks`}</p><button className="primary-button" type="button" onClick={() => play.context(playlist.uri)}>Play playlist</button></div></header><TrackList tracks={tracks} onPlay={(track) => play.context(playlist.uri, track.uri, visibleUris, trackEntries.find((entry) => entry.track === track)!.position)} /></div>
}
