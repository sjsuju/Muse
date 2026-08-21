import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { env: Record<string, string | undefined> }

// ponytail: base comes from the env so GitHub Pages can deploy under /Muse/
// while local dev and root-domain hosts (Vercel) keep working unchanged.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
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
        // Relative URLs resolve against the manifest itself, so they are correct
        // at both / and /Muse/ without any extra plumbing.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/muse-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/muse-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/muse-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
})
