import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useSpotifyClient } from '../spotify/useSpotify'

interface PlaybackContextValue {
  state: SpotifyWebPlaybackState | null
  ready: boolean
  playTrack: (uri: string) => Promise<void>
  playContext: (uri: string, offsetUri?: string) => Promise<void>
  togglePlay: () => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  setVolume: (volume: number) => Promise<void>
  setShuffle: (shuffle: boolean) => Promise<void>
  setRepeat: (mode: 'off' | 'context' | 'track') => Promise<void>
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null)
let sdkPromise: Promise<void> | null = null

function loadPlaybackSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = resolve
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('Spotify playback SDK failed to load'))
    document.head.append(script)
  })
  return sdkPromise
}

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { getAccessToken } = useAuth()
  const api = useSpotifyClient()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [state, setState] = useState<SpotifyWebPlaybackState | null>(null)

  useEffect(() => {
    let active = true
    let instance: SpotifyPlayer | null = null
    loadPlaybackSdk().then(() => {
      if (!active || !window.Spotify) return
      instance = new window.Spotify.Player({
        name: 'Muse on this Chromebook',
        volume: 0.75,
        getOAuthToken: (callback) => { void getAccessToken().then(callback) },
      })
      instance.addListener('ready', ((value: { device_id: string }) => {
        setDeviceId(value.device_id)
        setPlayer(instance)
      }) as (value: never) => void)
      instance.addListener('player_state_changed', ((value: SpotifyWebPlaybackState | null) => {
        if (value) setState(value)
      }) as (value: never) => void)
      instance.addListener('authentication_error', (() => navigate('/failure/auth')) as (value: never) => void)
      instance.addListener('account_error', (() => navigate('/failure/account')) as (value: never) => void)
      instance.addListener('initialization_error', (() => navigate('/failure/browser')) as (value: never) => void)
      instance.addListener('playback_error', (() => navigate('/failure/device')) as (value: never) => void)
      void instance.connect()
    }).catch(() => navigate('/failure/service'))
    return () => {
      active = false
      instance?.disconnect()
    }
  }, [getAccessToken, navigate])

  const requireDevice = useCallback(() => {
    if (!deviceId) throw new Error('Spotify playback device is not ready')
    return deviceId
  }, [deviceId])

  const playTrack = useCallback(async (uri: string) => {
    await api.request(`/me/player/play?device_id=${encodeURIComponent(requireDevice())}`, {
      method: 'PUT',
      body: JSON.stringify({ uris: [uri] }),
    })
  }, [api, requireDevice])

  const playContext = useCallback(async (uri: string, offsetUri?: string) => {
    await api.request(`/me/player/play?device_id=${encodeURIComponent(requireDevice())}`, {
      method: 'PUT',
      body: JSON.stringify({ context_uri: uri, ...(offsetUri ? { offset: { uri: offsetUri } } : {}) }),
    })
  }, [api, requireDevice])

  const setShuffle = useCallback(async (shuffle: boolean) => {
    await api.request(`/me/player/shuffle?state=${shuffle}&device_id=${encodeURIComponent(requireDevice())}`, { method: 'PUT' })
  }, [api, requireDevice])

  const setRepeat = useCallback(async (mode: 'off' | 'context' | 'track') => {
    await api.request(`/me/player/repeat?state=${mode}&device_id=${encodeURIComponent(requireDevice())}`, { method: 'PUT' })
  }, [api, requireDevice])

  const value = useMemo<PlaybackContextValue>(() => ({
    state,
    ready: Boolean(player && deviceId),
    playTrack,
    playContext,
    togglePlay: async () => { await player?.togglePlay() },
    next: async () => { await player?.nextTrack() },
    previous: async () => { await player?.previousTrack() },
    seek: async (positionMs) => { await player?.seek(positionMs) },
    setVolume: async (volume) => { await player?.setVolume(volume) },
    setShuffle,
    setRepeat,
  }), [deviceId, playContext, playTrack, player, setRepeat, setShuffle, state])

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

export function usePlayback(): PlaybackContextValue {
  const value = useContext(PlaybackContext)
  if (!value) throw new Error('usePlayback must be used inside PlaybackProvider')
  return value
}
