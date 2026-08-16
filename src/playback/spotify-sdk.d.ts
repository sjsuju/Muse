interface SpotifyWebPlaybackTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: Array<{ name: string }>
  album: { images: Array<{ url: string }> }
}

interface SpotifyWebPlaybackState {
  paused: boolean
  position: number
  duration: number
  repeat_mode: number
  shuffle: boolean
  restrictions: Record<string, boolean>
  track_window: { current_track: SpotifyWebPlaybackTrack }
}

interface SpotifyPlayerOptions {
  name: string
  getOAuthToken: (callback: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  activateElement(): Promise<void>
  addListener(event: string, callback: (value: never) => void): boolean
  removeListener(event?: string): void
  togglePlay(): Promise<void>
  nextTrack(): Promise<void>
  previousTrack(): Promise<void>
  seek(positionMs: number): Promise<void>
  setVolume(volume: number): Promise<void>
}

interface Window {
  Spotify?: { Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer }
  onSpotifyWebPlaybackSDKReady?: () => void
}
