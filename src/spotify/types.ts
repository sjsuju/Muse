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
  items?: SpotifyPage<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null> | { total: number } | null
  tracks?: SpotifyPage<{ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null> | { total: number } | null
}
export interface SpotifyPage<T> { items: T[]; total: number; next: string | null }
export interface SavedTrack { added_at: string; track: SpotifyTrack | null }
export interface SavedAlbum { added_at: string; album: SpotifyAlbum | null }
export interface SearchResults {
  tracks?: SpotifyPage<SpotifyTrack | null>
  albums?: SpotifyPage<SpotifyAlbum | null>
  playlists?: SpotifyPage<SpotifyPlaylist | null>
}

export function compactSpotifyItems<T>(
  items: readonly (T | null | undefined)[] | null | undefined,
): T[] {
  return items?.filter((item): item is T => item != null) ?? []
}

export function playablePlaylistTracks(
  items: readonly ({ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null | undefined)[] | null | undefined,
): SpotifyTrack[] {
  return playablePlaylistEntries(items).map((entry) => entry.track)
}

export function playablePlaylistEntries(
  items: readonly ({ item?: SpotifyTrack | null; track?: SpotifyTrack | null } | null | undefined)[] | null | undefined,
): Array<{ track: SpotifyTrack; position: number }> {
  return items?.flatMap((entry, position) => {
    if (!entry) return []
    const track = entry.item ?? entry.track
    return track?.album && Array.isArray(track.artists) && track.is_playable !== false ? [{ track, position }] : []
  }) ?? []
}
