import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { MuseApp } from './App'
import { getConfig } from './config'
import './styles.css'

const updateServiceWorker = registerSW({
  onNeedRefresh() {
    if (window.confirm('A Muse update is ready. Reload now?')) void updateServiceWorker(true)
  },
})

function ConfigError({ message }: { message: string }) {
  return <main className="failure-page"><section className="failure-panel"><p className="eyebrow">Muse setup</p><h1>Spotify configuration is missing</h1><p className="failure-issue">{message}</p><p>Run the safe configuration importer, then restart Muse.</p></section></main>
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
try {
  const config = getConfig()
  root.render(<React.StrictMode><BrowserRouter><MuseApp config={config} /></BrowserRouter></React.StrictMode>)
} catch (error) {
  const message = error instanceof Error ? error.message : 'Muse could not read its configuration.'
  root.render(<React.StrictMode><ConfigError message={message} /></React.StrictMode>)
}
