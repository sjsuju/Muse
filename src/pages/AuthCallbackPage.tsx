import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function AuthCallbackPage() {
  const { completeSignIn } = useAuth()
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = search.get('code')
    const state = search.get('state')
    if (!code || !state || search.get('error')) {
      navigate('/failure/auth', { replace: true })
      return
    }
    void completeSignIn(code, state)
      .then((returnTo) => navigate(returnTo, { replace: true }))
      .catch(() => navigate('/failure/auth', { replace: true }))
  }, [completeSignIn, navigate, search])

  return <main className="callback-page"><div className="media-skeleton" /><p>Opening your library...</p></main>
}
