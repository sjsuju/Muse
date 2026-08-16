import { Play } from '@phosphor-icons/react/Play'
import type { SpotifyTrack } from '../spotify/types'

function duration(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function TrackList({ tracks, onPlay }: { tracks: SpotifyTrack[]; onPlay: (track: SpotifyTrack) => void }) {
  return (
    <div className="track-list" role="list">
      {tracks.map((track, index) => (
        <div className="track-row" role="listitem" key={`${track.id}-${index}`}>
          <button type="button" aria-label={`Play ${track.name}`} onClick={() => onPlay(track)}><Play weight="fill" /></button>
          {track.album.images[0]?.url ? <img src={track.album.images[0].url} alt="" loading="lazy" /> : <div className="track-art-placeholder" />}
          <div className="track-title"><strong>{track.name}</strong><span>{track.artists.map((artist) => artist.name).join(', ')}</span></div>
          <span className="track-album">{track.album.name}</span>
          <time>{duration(track.duration_ms)}</time>
        </div>
      ))}
    </div>
  )
}
