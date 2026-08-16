import { Disc } from '@phosphor-icons/react/Disc'
import { House } from '@phosphor-icons/react/House'
import { ListBullets } from '@phosphor-icons/react/ListBullets'
import { MagnifyingGlass } from '@phosphor-icons/react/MagnifyingGlass'
import { MusicNotes } from '@phosphor-icons/react/MusicNotes'
import { SignOut } from '@phosphor-icons/react/SignOut'
import { VinylRecord } from '@phosphor-icons/react/VinylRecord'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PlayerBar } from '../playback/PlayerBar'

const links = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/search', label: 'Search', icon: MagnifyingGlass },
  { to: '/library/tracks', label: 'Saved tracks', icon: MusicNotes },
  { to: '/library/albums', label: 'Albums', icon: Disc },
  { to: '/library/playlists', label: 'Playlists', icon: ListBullets },
]

export function AppShell() {
  const { signOut } = useAuth()
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink className="wordmark" to="/" aria-label="Muse home"><span className="brand-mark"><VinylRecord weight="fill" /></span><strong>Muse</strong></NavLink>
        <nav aria-label="Primary navigation">
          {links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end}><Icon /><span>{label}</span></NavLink>)}
        </nav>
        <button className="sign-out" type="button" onClick={signOut}><SignOut /><span>Sign out</span></button>
      </aside>
      <main className="content"><Outlet /></main>
      <PlayerBar />
    </div>
  )
}
