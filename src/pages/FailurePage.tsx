import { ArrowLeft } from '@phosphor-icons/react/ArrowLeft'
import { MusicNotes } from '@phosphor-icons/react/MusicNotes'
import { Repeat } from '@phosphor-icons/react/Repeat'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getFailureDefinition, safeFailureState } from '../failures'

export function FailurePage() {
  const { code } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const heading = useRef<HTMLHeadingElement>(null)
  const definition = getFailureDefinition(code)
  const state = safeFailureState(
    location.state as { returnTo?: string; retryAt?: number; diagnostic?: string } | null,
  )
  const retryBlocked = definition.code === 'rate-limit' && Boolean(state.retryAt && state.retryAt > Date.now())

  useEffect(() => heading.current?.focus(), [])

  const recover = () => {
    if (definition.code === 'account') {
      window.open('https://www.spotify.com/account/', '_blank', 'noopener,noreferrer')
      return
    }
    navigate(definition.code === 'auth' ? '/' : state.returnTo, { replace: true })
  }

  return (
    <main className="failure-page">
      <section className="failure-panel" aria-labelledby="failure-title">
        <div className="brand-mark" aria-hidden="true"><MusicNotes weight="fill" /></div>
        <p className="eyebrow">Muse diagnostic</p>
        <h1 id="failure-title" ref={heading} tabIndex={-1}>{definition.title}</h1>
        <p className="failure-issue">{definition.issue}</p>
        <p className="failure-code">Issue: {definition.code}</p>
        {state.diagnostic ? <p className="failure-code">Detail: {state.diagnostic}</p> : null}
        <div className="failure-actions">
          <button className="primary-button" type="button" onClick={recover} disabled={retryBlocked}>
            <Repeat weight="bold" /> {retryBlocked ? 'Retry shortly' : definition.actionLabel}
          </button>
          <button className="text-button" type="button" onClick={() => navigate('/', { replace: true })}>
            <ArrowLeft /> Return to Muse
          </button>
        </div>
      </section>
    </main>
  )
}
