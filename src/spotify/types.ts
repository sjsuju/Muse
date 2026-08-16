export interface SpotifyImage { url: string; width?: number; height?: number }
export interface SpotifyArtist { id?: string; name: string }
export interface SpotifyAlbum {
  id: string
  uri: string
  name: string
  album_type?: string
  images: SpotifyImage[]
  artists: SpotifyArtist[]
  release_date?: string
  tracks?: SpotifyPage<SpotifyTrack>
}
export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  is_playable?: boolean
}
export interface SpotifyPlaylist {
  id: string
  uri: string
  name: string
  description?: string
  images: SpotifyImage[]
  owner?: { display_name?: string }
  tracks: SpotifyPage<{ track: SpotifyTrack | null }> | { total: number }
}
export interface SpotifyPage<T> { items: T[]; total: number; next: string | null }
export interface SavedTrack { added_at: string; track: SpotifyTrack }
export interface SavedAlbum { added_at: string; album: SpotifyAlbum }
export interface SearchResults {
  tracks?: SpotifyPage<SpotifyTrack>
  albums?: SpotifyPage<SpotifyAlbum>
  playlists?: SpotifyPage<SpotifyPlaylist | null>
}
