# Spotify Library PWA Design

Date: 2026-08-15
Status: Ready for user review

## Purpose

Build a production-ready, installable Spotify library player for a Chromebook. The app uses Spotify's official Web API and Web Playback SDK, requires a Spotify Premium account, and runs as a hosted progressive web app without requiring Linux or development tools on the Chromebook.

The product name is **Muse**. Its visual direction is **Quiet Library**: warm paper tones, editorial typography, generous spacing, a circular music-note app mark, and familiar music-player navigation without copying Spotify's branded visual identity.

## Goals

- Authenticate a Spotify Premium user through Authorization Code with PKCE.
- Browse and play saved tracks, albums, and playlists.
- Search Spotify's catalog and start playback from search results.
- Provide play, pause, previous, next, seek, shuffle, repeat, and volume controls.
- Show persistent now-playing information throughout the app.
- Install on ChromeOS as a PWA and work at Chromebook viewport sizes.
- Produce an optimized production build suitable for static HTTPS hosting.
- Redirect failures to dedicated pages that identify the failure, explain the likely issue, and provide a recovery action.

## Non-goals

- Bypassing content blockers, network controls, or device-management policies.
- Proxying, downloading, recording, or storing Spotify audio.
- Supporting non-Premium playback through the Web Playback SDK.
- Building a custom backend, database, social system, analytics system, or recommendation engine.
- Creating a pixel-for-pixel Spotify clone.

## Technical Architecture

### Application stack

- React and TypeScript for the application and UI.
- Vite for development and optimized production builds.
- React Router for application and diagnostic routes.
- A lightweight PWA integration for the manifest, service worker, update lifecycle, and installability.
- Vitest and React Testing Library for automated tests.

The app is a static client application. It has no custom backend and contains no Spotify client secret. Production configuration provides a public Spotify client ID and exact redirect URI through environment variables.

### Spotify integration

- Authorization Code with PKCE handles browser authentication.
- A typed API client handles Spotify Web API calls, pagination, rate-limit responses, and token refresh.
- Spotify Web Playback SDK creates the browser playback device and streams audio directly from Spotify.
- One playback provider owns SDK lifecycle, device identity, transfer-of-playback behavior, and player state.
- One library data layer owns saved tracks, albums, playlists, search results, caching, and request cancellation.

### Security boundaries

- No client secret is shipped to the browser.
- Tokens are stored only in the user's browser and are cleared on logout or unrecoverable authentication failure.
- The production host uses HTTPS, a restrictive Content Security Policy, and no analytics or unrelated third-party scripts.
- OAuth state and PKCE verifier values are validated before tokens are accepted.
- Spotify errors are normalized before display so raw tokens, request headers, and sensitive callback values never appear on diagnostic pages.

## Routes and Screens

### Product routes

- `/` — home and recently used library content.
- `/search` — Spotify catalog search.
- `/library/tracks` — saved tracks.
- `/library/albums` — saved albums.
- `/library/playlists` — current user's playlists.
- `/playlist/:playlistId` — playlist detail and playable track list.
- `/album/:albumId` — album detail and playable track list.
- `/auth/callback` — validates the OAuth response and completes PKCE authentication.

### Diagnostic redirect routes

Every diagnostic page uses the Quiet Library visual system and contains a short failure title, plain-language issue description, optional safe technical code, primary recovery action, and link back to the app when appropriate.

- `/failure/auth` — denied consent, invalid OAuth state, failed token exchange, expired refresh state, or revoked access; offers sign-in again.
- `/failure/account` — Premium is unavailable or required Spotify account capabilities are missing; offers account verification and sign-out.
- `/failure/device` — playback SDK cannot create or activate a device, or playback transfer fails; offers retry and device selection guidance.
- `/failure/network` — the browser is offline, Spotify cannot be reached, or a request times out; offers retry and preserves the intended destination.
- `/failure/rate-limit` — Spotify returns a rate limit; shows the safe retry time and disables premature retries.
- `/failure/service` — Spotify API or playback service is unavailable, or the SDK fails to initialize; offers retry and status guidance.
- `/failure/browser` — required browser playback, storage, media, or service-worker capabilities are unavailable; lists the missing capability.
- `/failure/not-found` — an app route or requested Spotify resource does not exist; returns to the relevant library screen.

Expected empty states, such as an empty playlist or no search results, remain within their product screen and do not redirect to a failure page.

## Component Boundaries

- `AppShell` owns responsive layout, routing outlets, sidebar navigation, top bar, and global status regions.
- `AuthProvider` owns session restoration, OAuth initiation, callback completion, refresh, and logout.
- `SpotifyApiClient` owns authenticated HTTP calls, response normalization, pagination, cancellation, and rate-limit metadata.
- `LibraryRepository` exposes typed track, album, playlist, and search operations without leaking transport details into components.
- `PlaybackProvider` owns Web Playback SDK setup, device activation, Spotify Connect transfer, playback commands, and current state.
- `PlayerBar` renders now-playing metadata and playback controls from `PlaybackProvider`.
- Route-level screens own loading, empty, success, and recoverable inline states for their specific data.
- `FailurePage` renders diagnostic content from a typed failure code and never receives raw exception text from the URL.

## Data Flow

### Authentication

1. The user selects sign in.
2. The app generates a PKCE verifier, challenge, and OAuth state, then redirects to Spotify authorization.
3. Spotify redirects to `/auth/callback` with a code or safe error parameters.
4. The callback validates state, exchanges the code, stores the session, and removes temporary PKCE data.
5. The app restores the originally requested route or redirects to the appropriate authentication failure page.
6. During a session, one refresh attempt is made before an expired session redirects to `/failure/auth`.

### Library data

1. A route requests typed data from `LibraryRepository`.
2. The repository checks its in-memory cache and calls `SpotifyApiClient` when data is stale or absent.
3. Pagination appends normalized items while preserving scroll and selection state.
4. A failed request is classified as inline-recoverable or redirect-worthy.
5. Successful user-initiated refreshes replace stale data without duplicating records.

### Playback

1. `PlaybackProvider` loads the official SDK after authentication and obtains a device ID.
2. The provider activates or transfers playback to the PWA device when the user initiates playback.
3. Track or context URIs are sent through official Spotify playback endpoints.
4. SDK events update shared now-playing, position, duration, restriction, and connection state.
5. Controls wait for Spotify confirmation when an optimistic update cannot be safely rolled back.

## Visual Design

- Warm neutral canvas, charcoal text, muted terracotta, sage, ochre, and slate album-derived accents.
- Editorial serif display type paired with a legible system sans-serif for navigation and controls.
- Circular music-note mark used in the sidebar, sign-in screen, favicon, and installable app icon.
- Desktop-first Chromebook layout with a restrained sidebar, spacious library grid, and persistent bottom player.
- Familiar music-player interaction patterns remain, but Spotify's exact colors, typography, logo, and branded composition are not copied.
- Reduced-motion preferences disable nonessential animation; keyboard focus is always visible.

## PWA and Production Behavior

- The manifest provides the Muse name, music-note icons, theme colors, standalone display mode, and a stable start URL.
- The service worker caches only the versioned application shell and safe static assets.
- Spotify API responses, OAuth callbacks, tokens, and audio are never stored in the service-worker cache.
- Offline navigation displays `/failure/network` while preserving the intended destination for retry.
- A waiting service worker announces an available update and applies it only after user confirmation or a clean restart.
- Production output is a deterministic static build with source maps disabled by default and environment validation at build time.
- The host must serve the app over HTTPS and rewrite non-asset routes to `index.html`.

## Error Classification

- Errors are normalized into a closed `FailureCode` union rather than passing arbitrary strings between routes.
- Redirect state contains only the failure code, originating route, safe retry timestamp, and non-sensitive correlation identifier when available.
- Authentication, account, device, network, rate-limit, service, browser, and not-found failures map to their dedicated routes.
- Expected user-correctable conditions on a healthy screen remain inline when redirecting would destroy useful context.
- Repeated automatic retries are bounded to prevent loops; manual retry is disabled until Spotify's rate-limit delay expires.

## Accessibility and Responsive Behavior

- All playback actions have accessible names and keyboard controls.
- Color is never the only indicator of playback, focus, loading, or failure state.
- The main layout targets common Chromebook widths and collapses the sidebar to a compact rail at narrower widths.
- Track tables convert to stacked rows when space is limited while preserving the primary action and metadata.
- Focus moves to the diagnostic page heading after a failure redirect and returns predictably after recovery.

## Testing and Verification

### Automated tests

- Unit tests cover PKCE helpers, token expiry, one-shot refresh, pagination, failure classification, retry timing, and display formatting.
- Component tests cover sign-in, callback outcomes, library loading, empty states, failure redirects, recovery actions, and player controls.
- Playback SDK and Web API adapters are tested through explicit fakes so automated tests never require a live Spotify account.
- Routing tests confirm that raw error text and secrets cannot be injected into diagnostic pages.

### Production verification

- Type checking, linting, unit/component tests, and the production build must succeed.
- The generated manifest, service worker, icons, route fallback, and security headers are inspected.
- A manual Chromium pass uses Chromebook-sized viewports and keyboard-only navigation.
- A live Spotify Premium smoke test verifies sign-in, saved content, search, device activation, playback, controls, refresh, logout, and representative failure redirects.
- Installation and launch in standalone PWA mode are verified on the target Chromebook before release is considered complete.

## Acceptance Criteria

- A Spotify Premium user can authenticate without a client secret in the browser bundle.
- Saved tracks, albums, playlists, playlist details, album details, and search results render and paginate correctly.
- The user can begin and control Spotify playback through the PWA device.
- The player bar remains synchronized with Spotify SDK state across navigation.
- Every classified fatal failure redirects to its dedicated page with a clear issue and recovery action.
- Expected empty and recoverable states do not unnecessarily remove the user from their current screen.
- The app is installable, accessible at Chromebook sizes, and produces a verified production build.
- No Spotify audio is proxied, downloaded, recorded, or cached by the app.
