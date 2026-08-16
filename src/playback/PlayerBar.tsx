import { Pause } from '@phosphor-icons/react/Pause'
import { Play } from '@phosphor-icons/react/Play'
import { Repeat } from '@phosphor-icons/react/Repeat'
import { RepeatOnce } from '@phosphor-icons/react/RepeatOnce'
import { Shuffle } from '@phosphor-icons/react/Shuffle'
import { SkipBack } from '@phosphor-icons/react/SkipBack'
import { SkipForward } from '@phosphor-icons/react/SkipForward'
import { SpeakerHigh } from '@phosphor-icons/react/SpeakerHigh'
import { usePlayback } from './PlaybackProvider'

function formatTime(milliseconds: number): string {
  if (!Number.isFinite(milliseconds)) return '0:00'
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function PlayerBar() {
  const playback = usePlayback()
  const track = playback.state?.track_window.current_track
  const position = playback.state?.position ?? 0
  const duration = playback.state?.duration ?? track?.duration_ms ?? 0
  const repeatMode = playback.state?.repeat_mode ?? 0

  return (
    <footer className="player-bar" aria-label="Music player">
      <div className="now-playing">
        {track?.album.images[0]?.url
          ? <img src={track.album.images[0].url} alt="" />
          : <div className="artwork-placeholder" aria-hidden="true" />}
        <div>
          <strong>{track?.name ?? 'Choose something to play'}</strong>
          <span>{track?.artists.map((artist) => artist.name).join(', ') ?? 'Muse is ready'}</span>
        </div>
      </div>
      <div className="transport">
        <div className="transport-buttons">
          <button type="button" aria-label="Shuffle" className={playback.state?.shuffle ? 'is-active' : ''} onClick={() => void playback.setShuffle(!playback.state?.shuffle)}><Shuffle /></button>
          <button type="button" aria-label="Previous track" onClick={() => void playback.previous()}><SkipBack weight="fill" /></button>
          <button className="play-button" type="button" aria-label={playback.state?.paused ? 'Play' : 'Pause'} onClick={() => void playback.togglePlay()} disabled={!playback.ready}>{playback.state?.paused ? <Play weight="fill" /> : <Pause weight="fill" />}</button>
          <button type="button" aria-label="Next track" onClick={() => void playback.next()}><SkipForward weight="fill" /></button>
          <button type="button" aria-label="Repeat" className={repeatMode ? 'is-active' : ''} onClick={() => void playback.setRepeat(repeatMode === 0 ? 'context' : repeatMode === 1 ? 'track' : 'off')}>{repeatMode === 2 ? <RepeatOnce /> : <Repeat />}</button>
        </div>
        <div className="progress-row">
          <span>{formatTime(position)}</span>
          <input aria-label="Track position" type="range" min="0" max={Math.max(duration, 1)} value={Math.min(position, duration)} onChange={(event) => void playback.seek(Number(event.target.value))} />
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <label className="volume-control">
        <SpeakerHigh aria-hidden="true" />
        <span className="sr-only">Volume</span>
        <input aria-label="Volume" type="range" min="0" max="1" step="0.05" defaultValue="0.75" onChange={(event) => void playback.setVolume(Number(event.target.value))} />
      </label>
    </footer>
  )
}
