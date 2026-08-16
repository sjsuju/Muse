import { MusicNotes } from '@phosphor-icons/react/MusicNotes'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage() {
  const { signIn } = useAuth()
  const location = useLocation()
  return (
    <main className="login-page">
      <section className="login-copy">
        <div className="brand-lockup"><span className="brand-mark"><MusicNotes weight="fill" /></span><strong>Muse</strong></div>
        <p className="eyebrow">Your Spotify library</p>
        <h1>Music with room to breathe.</h1>
        <p>Search, collect, and play your Spotify library in a calmer space made for the Chromebook.</p>
        <button className="primary-button" type="button" onClick={() => void signIn(location.pathname)}>
          Continue with Spotify
        </button>
        <small>Requires Spotify Premium. Muse never receives your password.</small>
      </section>
      <div className="login-art" aria-hidden="true">
        <div className="record"><span /></div>
        <p>Quiet Library</p>
      </div>
    </main>
  )
}
