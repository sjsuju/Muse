# Spotify Setup

## Developer dashboard

1. Open the Spotify developer dashboard and select the existing SpotifyTuner application.
2. Add `http://127.0.0.1:5173/auth/callback` as a redirect URI for local development.
3. Add `https://YOUR-PRODUCTION-DOMAIN/auth/callback` after choosing the production host.
4. Save the dashboard settings.
5. Do not add `localhost`; Spotify requires the loopback IP form for an HTTP development redirect.

## Local configuration

Run:

```powershell
npm run import:spotify-config
```

The importer reads `C:\Users\shubh\VSCODE\SpotifyTuner\backend\.env`, copies only the public client ID, and creates the ignored `.env.local` file. It never copies or prints the client secret.

The resulting browser-safe keys are:

```dotenv
VITE_SPOTIFY_CLIENT_ID=public_client_id
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/callback
```

## Production configuration

Set these environment variables in the static hosting service before building:

```dotenv
VITE_SPOTIFY_CLIENT_ID=public_client_id
VITE_SPOTIFY_REDIRECT_URI=https://YOUR-PRODUCTION-DOMAIN/auth/callback
```

Deploy the generated `dist` directory over HTTPS. The host must rewrite application routes to `index.html`; `vercel.json` and `public/_headers` provide rewrite and security configuration for common static hosts.

## Required account conditions

- The signed-in account needs Spotify Premium for Web Playback SDK streaming.
- Development-mode users may need to be allowlisted in the Spotify developer dashboard.
- Browser autoplay rules require the user to initiate the first playback action.

## Key rotation

The client secret is unused by Muse. Rotating it does not require a PWA rebuild. If the public client ID changes, rerun the importer and rebuild.
