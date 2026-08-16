import { Play } from '@phosphor-icons/react/Play'
import { Link } from 'react-router-dom'

export function MediaCard({
  title,
  subtitle,
  image,
  to,
  onPlay,
}: {
  title: string
  subtitle: string
  image?: string
  to: string
  onPlay: () => void
}) {
  return (
    <article className="media-card">
      <Link to={to} aria-label={`Open ${title}`}>
        {image ? <img src={image} alt="" loading="lazy" /> : <div className="cover-placeholder" />}
      </Link>
      <div className="media-card-copy">
        <div><Link to={to}>{title}</Link><span>{subtitle}</span></div>
        <button type="button" aria-label={`Play ${title}`} onClick={onPlay}><Play weight="fill" /></button>
      </div>
    </article>
  )
}
