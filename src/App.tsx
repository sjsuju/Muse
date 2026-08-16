import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthProvider'
import type { AppConfig } from './config'
import { AppShell } from './layout/AppShell'
import { PlaybackProvider } from './playback/PlaybackProvider'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { FailurePage } from './pages/FailurePage'
import { AlbumPage, AlbumsPage, HomePage, PlaylistPage, PlaylistsPage, SearchPage, TracksPage } from './pages/LibraryPages'
import { LoginPage } from './pages/LoginPage'

function OfflineGuard() {
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    const onOffline = () => {
      if (!location.pathname.startsWith('/failure/')) {
        navigate('/failure/network', { state: { returnTo: location.pathname + location.search } })
      }
    }
    window.addEventListener('offline', onOffline)
    return () => window.removeEventListener('offline', onOffline)
  }, [location.pathname, location.search, navigate])
  return null
}

function AuthenticatedLayout() {
  const { status } = useAuth()
  if (status === 'anonymous') return <LoginPage />
  return <PlaybackProvider><AppShell /></PlaybackProvider>
}

export function MuseApp({ config }: { config: AppConfig }) {
  return (
    <AuthProvider config={config}>
      <OfflineGuard />
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/failure/:code" element={<FailurePage />} />
        <Route path="/" element={<AuthenticatedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="library/tracks" element={<TracksPage />} />
          <Route path="library/albums" element={<AlbumsPage />} />
          <Route path="library/playlists" element={<PlaylistsPage />} />
          <Route path="album/:albumId" element={<AlbumPage />} />
          <Route path="playlist/:playlistId" element={<PlaylistPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/failure/not-found" replace />} />
      </Routes>
    </AuthProvider>
  )
}
