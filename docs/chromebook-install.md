# Chromebook Installation

## Deploy

1. Choose an HTTPS static host such as Vercel, Cloudflare Pages, or Netlify.
2. Set `VITE_SPOTIFY_CLIENT_ID` and the production `VITE_SPOTIFY_REDIRECT_URI` in the host.
3. Build with `npm run build` and deploy `dist`.
4. Register the exact production callback URL in the Spotify developer dashboard.
5. Open the deployed address and complete Spotify sign-in.

## Install on ChromeOS

1. Open the deployed Muse address in Chrome.
2. Select the install icon in the address bar, or open the Chrome menu and select **Install Muse**.
3. Confirm installation.
4. Launch Muse from the Chromebook launcher.

## If installation is unavailable

- Confirm the site uses HTTPS and loads without a certificate warning.
- Reload once so Chrome receives the service worker and manifest.
- Confirm the PWA icons and `manifest.webmanifest` return successfully.
- Clear only the Muse site data, reload, and try installation again.

## Spotify failures

Muse redirects fatal issues to a dedicated diagnostic page. Each page states the failure type, likely issue, and recovery action. Empty playlists and no-result searches stay inside the current screen because they are not application failures.
