import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { SpotifyFailure } from '../spotify/api'
import { useSpotifyClient } from '../spotify/useSpotify'
import { createDeviceActivator, retryPlayerCommand } from './activateDevice'
import { createDeviceGate } from './deviceGate'
import { runPlaybackAction } from './playbackAction'

interface PlaybackContextValue {
  state: SpotifyWebPlaybackState | null
  ready: boolean
  error: string | null
  playTrack: (uri: string, visibleUris?: string[]) => Promise<void>
  playContext: (uri: string, offsetUri?: string, visibleUris?: string[], offsetPosition?: number) => Promise<void>
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
  const getAccessTokenRef = useRef(getAccessToken)
  const navigateRef = useRef(navigate)
  getAccessTokenRef.current = getAccessToken
  navigateRef.current = navigate
  const [player, setPlayer] = useState<SpotifyPlayer | null>(null)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [state, setState] = useState<SpotifyWebPlaybackState | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const deviceGate = useRef(createDeviceGate())
  const deviceIdRef = useRef<string | null>(null)
  const activateDevice = useMemo(
    () => createDeviceActivator((path, init) => api.request(path, init)),
    [api],
  )
  const runPlayerCommand = useCallback(async (
    readyDeviceId: string,
    path: string,
    init: RequestInit,
  ) => retryPlayerCommand(
    () => api.request(path, init),
    async () => {
      activateDevice.reset()
      await activateDevice(readyDeviceId)
      await new Promise<void>((resolve) => setTimeout(resolve, 250))
    },
  ), [activateDevice, api])
  const perform = useCallback(
    async (action: () => Promise<unknown>) => { await runPlaybackAction(action, setPlaybackError) },
    [],
  )

  useEffect(() => {
    let active = true
    let instance: SpotifyPlayer | null = null
    loadPlaybackSdk().then(() => {
      if (!active || !window.Spotify) return
      instance = new window.Spotify.Player({
        name: 'Muse on this Chromebook',
        volume: 0.75,
        getOAuthToken: (callback) => { void getAccessTokenRef.current().then(callback) },
      })
      setPlayer(instance)
      instance.addListener('ready', ((value: { device_id: string }) => {
        deviceIdRef.current = value.device_id
        setDeviceId(value.device_id)
        deviceGate.current.ready(value.device_id)
      }) as (value: never) => void)
      instance.addListener('not_ready', ((value: { device_id: string }) => {
        if (deviceIdRef.current !== value.device_id) return
        deviceIdRef.current = null
        setDeviceId(null)
        deviceGate.current.unavailable()
        activateDevice.reset()
      }) as (value: never) => void)
      instance.addListener('player_state_changed', ((value: SpotifyWebPlaybackState | null) => {
        setState(value)
        if (value) setPlaybackError((current) => current === 'Playback error' ? null : current)
      }) as (value: never) => void)
      instance.addListener('authentication_error', (() => navigateRef.current('/failure/auth')) as (value: never) => void)
      instance.addListener('account_error', (() => navigateRef.current('/failure/account')) as (value: never) => void)
      instance.addListener('initialization_error', (() => navigateRef.current('/failure/browser')) as (value: never) => void)
      instance.addListener('playback_error', ((value: { message?: string }) => {
        setPlaybackError(value.message || 'Spotify rejected that playback command')
      }) as (value: never) => void)
      void instance.connect().then((connected) => {
        if (!connected) {
          deviceGate.current.fail('Spotify declined to activate this browser as a playback device')
          navigateRef.current('/failure/device', {
            state: { diagnostic: 'Spotify SDK connect returned false' },
          })
        }
      }).catch(() => {
        deviceGate.current.fail('Spotify playback connection failed')
        navigateRef.current('/failure/device', {
          state: { diagnostic: 'Spotify SDK connection rejected' },
        })
      })
    }).catch(() => navigateRef.current('/failure/service'))
    return () => {
      active = false
      instance?.disconnect()
      deviceGate.current.dispose()
    }
  // The SDK must live for the provider lifetime; route changes must not recreate it.
  }, [])

  const playTrack = useCallback(async (uri: string, visibleUris: string[] = [uri]) => {
    await perform(async () => {
      await player?.activateElement()
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      await runPlayerCommand(readyDeviceId, `/me/player/play?device_id=${encodeURIComponent(readyDeviceId)}`, {
        method: 'PUT',
        body: JSON.stringify({ uris: rotateUris(uri, visibleUris) }),
      })
    })
  }, [activateDevice, perform, player, runPlayerCommand])

  const playContext = useCallback(async (uri: string, offsetUri?: string, visibleUris?: string[], offsetPosition?: number) => {
    await perform(async () => {
      await player?.activateElement()
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      const path = `/me/player/play?device_id=${encodeURIComponent(readyDeviceId)}`
      try {
        await runPlayerCommand(readyDeviceId, path, {
          method: 'PUT',
          body: JSON.stringify({
            context_uri: uri,
            ...(offsetPosition !== undefined
              ? { offset: { position: offsetPosition } }
              : offsetUri ? { offset: { uri: offsetUri } } : {}),
          }),
        })
      } catch (error) {
        if (!(error instanceof SpotifyFailure) || ![400, 403, 404].includes(error.status ?? 0) || !visibleUris?.length) throw error
        await runPlayerCommand(readyDeviceId, path, {
          method: 'PUT',
          body: JSON.stringify({ uris: rotateUris(offsetUri ?? visibleUris[0], visibleUris) }),
        })
      }
    })
  }, [activateDevice, perform, player, runPlayerCommand])

  const setShuffle = useCallback(async (shuffle: boolean) => {
    await perform(async () => {
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      await runPlayerCommand(readyDeviceId, `/me/player/shuffle?state=${shuffle}&device_id=${encodeURIComponent(readyDeviceId)}`, { method: 'PUT' })
    })
  }, [activateDevice, perform, runPlayerCommand])

  const setRepeat = useCallback(async (mode: 'off' | 'context' | 'track') => {
    await perform(async () => {
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      await runPlayerCommand(readyDeviceId, `/me/player/repeat?state=${mode}&device_id=${encodeURIComponent(readyDeviceId)}`, { method: 'PUT' })
    })
  }, [activateDevice, perform, runPlayerCommand])

  const value = useMemo<PlaybackContextValue>(() => ({
    state,
    ready: Boolean(player && deviceId),
    error: playbackError,
    playTrack,
    playContext,
    togglePlay: async () => { await perform(async () => {
      const readyDeviceId = await deviceGate.current.wait()
      await player?.activateElement()
      await activateDevice(readyDeviceId)
      await player?.togglePlay()
    }) },
    next: async () => { await perform(async () => {
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      await runPlayerCommand(readyDeviceId, `/me/player/next?device_id=${encodeURIComponent(readyDeviceId)}`, { method: 'POST' })
    }) },
    previous: async () => { await perform(async () => {
      const readyDeviceId = await deviceGate.current.wait()
      await activateDevice(readyDeviceId)
      await runPlayerCommand(readyDeviceId, `/me/player/previous?device_id=${encodeURIComponent(readyDeviceId)}`, { method: 'POST' })
    }) },
    seek: async (positionMs) => { await perform(async () => { await player?.seek(positionMs) }) },
    setVolume: async (volume) => { await perform(async () => { await player?.setVolume(volume) }) },
    setShuffle,
    setRepeat,
  }), [activateDevice, deviceId, perform, playContext, playbackError, playTrack, player, runPlayerCommand, setRepeat, setShuffle, state])

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

function rotateUris(selectedUri: string, visibleUris: string[]): string[] {
  const selectedIndex = visibleUris.indexOf(selectedUri)
  return selectedIndex < 0 ? [selectedUri, ...visibleUris] : [...visibleUris.slice(selectedIndex), ...visibleUris.slice(0, selectedIndex)]
}

export function usePlayback(): PlaybackContextValue {
  const value = useContext(PlaybackContext)
  if (!value) throw new Error('usePlayback must be used inside PlaybackProvider')
  return value
}
