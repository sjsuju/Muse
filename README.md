# Muse

Muse is a production-ready React and TypeScript PWA for browsing and playing a Spotify Premium library on a Chromebook.

## What it includes

- Spotify Authorization Code with PKCE. No client secret is shipped.
- Saved tracks, albums, playlists, search, album detail, and playlist detail.
- Spotify Web Playback SDK controls with a persistent player.
- Dedicated diagnostic pages for authentication, account, device, network, rate-limit, service, browser, and not-found failures.
- Responsive Quiet Library design, installable PWA metadata, offline shell, security headers, tests, and a production build.

## Start locally

```powershell
npm install
npm run import:spotify-config
npm run dev
```

Open `http://127.0.0.1:5173`. Register `http://127.0.0.1:5173/auth/callback` in the Spotify developer dashboard first.

## Verify and build

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run build
npm run audit:secrets
```

The deployable output is `dist`. See [Spotify setup](docs/spotify-setup.md) and [Chromebook installation](docs/chromebook-install.md).

## Security

The browser app uses only the public Spotify client ID. `SPOTIFY_CLIENT_SECRET` is neither needed nor copied. Local configuration is ignored by Git, production source maps are disabled, and the secret audit compares the project against the existing secret without printing it.
