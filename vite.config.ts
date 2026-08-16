import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: false,
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    sourcemap: false,
  },
})
