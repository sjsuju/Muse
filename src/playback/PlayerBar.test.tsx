import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayerBar } from './PlayerBar'

const usePlayback = vi.hoisted(() => vi.fn())

vi.mock('./PlaybackProvider', () => ({ usePlayback }))

const track = {
  name: 'Current track',
  duration_ms: 180_000,
  artists: [{ name: 'Artist' }],
  album: { images: [] },
}

function playbackValue(overrides: Record<string, unknown> = {}) {
  return {
    ready: true,
    error: null,
    state: {
      paused: true,
      position: 0,
      duration: 180_000,
      repeat_mode: 0,
      shuffle: false,
      restrictions: {},
      track_window: { current_track: track },
    },
    togglePlay: vi.fn(),
    next: vi.fn(),
    previous: vi.fn(),
    seek: vi.fn(),
    setVolume: vi.fn(),
    setShuffle: vi.fn(),
    setRepeat: vi.fn(),
    ...overrides,
  }
}

describe('PlayerBar transport restrictions', () => {
  beforeEach(() => {
    usePlayback.mockReset()
  })

  it('disables every transport action until playback is ready', () => {
    usePlayback.mockReturnValue(playbackValue({ ready: false }))
    render(<PlayerBar />)

    expect(screen.getByRole('button', { name: 'Shuffle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Repeat' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Track position' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Volume' })).toBeDisabled()
  })

  it('keeps transport disabled until Spotify supplies a playback state', () => {
    usePlayback.mockReturnValue(playbackValue({ state: null }))
    render(<PlayerBar />)

    expect(screen.getByRole('button', { name: 'Shuffle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Repeat' })).toBeDisabled()
  })

  it('disables actions rejected by the SDK restrictions', () => {
    usePlayback.mockReturnValue(playbackValue({
      state: {
        ...playbackValue().state,
        restrictions: {
          disallow_toggling_shuffle: true,
          disallow_skipping_prev: true,
          disallow_resuming: true,
          disallow_skipping_next: true,
          disallow_seeking: true,
          disallow_toggling_repeat_context: true,
          disallow_toggling_repeat_track: true,
        },
      },
    }))
    render(<PlayerBar />)

    expect(screen.getByRole('button', { name: 'Shuffle' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Play' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next track' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Repeat' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Track position' })).toBeDisabled()
  })

  it('cycles repeat through the next allowed mode', () => {
    const setRepeat = vi.fn()
    usePlayback.mockReturnValue(playbackValue({
      setRepeat,
      state: {
        ...playbackValue().state,
        restrictions: { disallow_toggling_repeat_context: true },
      },
    }))
    const { rerender } = render(<PlayerBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Repeat' }))
    expect(setRepeat).toHaveBeenCalledWith('track')

    setRepeat.mockClear()
    usePlayback.mockReturnValue(playbackValue({
      setRepeat,
      state: {
        ...playbackValue().state,
        repeat_mode: 1,
        restrictions: { disallow_toggling_repeat_track: true },
      },
    }))
    rerender(<PlayerBar />)
    fireEvent.click(screen.getByRole('button', { name: 'Repeat' }))
    expect(setRepeat).toHaveBeenCalledWith('off')
  })

  it('keeps the complete playback diagnostic available as a tooltip', () => {
    const diagnostic = 'Spotify API returned HTTP 404 for /v1/me/player/next'
    usePlayback.mockReturnValue(playbackValue({ error: diagnostic }))
    render(<PlayerBar />)

    expect(screen.getByText(`Playback issue: ${diagnostic}`)).toHaveAttribute('title', diagnostic)
  })
})
