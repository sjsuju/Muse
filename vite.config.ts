import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/muse-192.png', 'icons/muse-512.png'],
      manifest: {
        name: 'Muse Spotify Library',
        short_name: 'Muse',
        description: 'A calm player for your Spotify library.',
        theme_color: '#eeeae0',
        background_color: '#eeeae0',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/muse-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/muse-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/muse-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
})
