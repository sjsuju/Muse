# Spotify Library PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver Muse, a production-ready React and TypeScript Spotify library PWA with official PKCE authentication, library browsing, browser playback, dedicated diagnostic redirects, and Chromebook installation support.

**Architecture:** A static Vite application owns authentication, a typed Spotify Web API adapter, an in-memory library repository, and a Spotify Web Playback SDK provider. React Router separates product and diagnostic routes; a service worker caches only the application shell. Browser configuration includes a public Spotify client ID and exact redirect URI, never a client secret.

**Tech Stack:** React, TypeScript, Vite, React Router, Vitest, React Testing Library, vite-plugin-pwa, CSS modules/global design tokens, Spotify Web API, Spotify Web Playback SDK.

## Global Constraints

- Project root is `C:\Users\shubh\VSCODE\Spotify PWA`.
- Build an optimized production PWA for an HTTPS static host and Chromebook-sized Chromium.
- Use Authorization Code with PKCE; never ship or copy `SPOTIFY_CLIENT_SECRET`.
- Stream audio only through Spotify's official Web Playback SDK; never proxy, record, download, or cache audio.
- Use the approved Quiet Library visual direction and distinct Muse branding.
- Redirect classified fatal failures to dedicated pages that state the failure, issue, and recovery action.
- Keep expected empty states and safely recoverable failures inline.
- Do not add analytics, a backend, a database, a state-management framework, or a request-cache dependency.

---

## File Structure

- `package.json`, `package-lock.json` — scripts and pinned dependencies.
- `vite.config.ts`, `tsconfig*.json`, `eslint.config.js` — build, PWA, TypeScript, and lint configuration.
- `.gitignore`, `.env.example` — exclude local tokens/configuration and document public variables.
- `scripts/import-spotify-config.mjs` — copy only the public client ID from SpotifyTuner without logging its value.
- `public/icons/*` — Muse music-note install icons.
- `src/main.tsx`, `src/App.tsx` — bootstrap, providers, and route tree.
- `src/styles.css` — Quiet Library tokens, responsive layout, focus, and reduced-motion rules.
- `src/config.ts` — validate browser-safe environment variables.
- `src/auth/pkce.ts`, `src/auth/session.ts`, `src/auth/AuthProvider.tsx` — OAuth primitives and session lifecycle.
- `src/spotify/types.ts`, `src/spotify/api.ts`, `src/spotify/library.ts` — typed Spotify transport and normalization.
- `src/playback/spotify-sdk.d.ts`, `src/playback/PlaybackProvider.tsx`, `src/playback/PlayerBar.tsx` — SDK lifecycle and controls.
- `src/layout/AppShell.tsx` — sidebar, top bar, route outlet, and player placement.
- `src/components/*` — reusable album, playlist, track, loading, and empty-state views.
- `src/pages/*` — sign-in, callback, home, search, library, detail, and failure screens.
- `src/failures.ts` — closed failure taxonomy and redirect payload validation.
- `src/test/*`, `src/**/*.test.ts(x)` — deterministic API/SDK fakes and behavior tests.
- `vercel.json`, `public/_headers` — SPA rewrite and production security headers.

## Task 1: Production Scaffold and Safe Configuration

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`
- Create: `.gitignore`, `.env.example`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/config.ts`, `src/test/setup.ts`
- Create: `scripts/import-spotify-config.mjs`
- Test: `src/config.test.ts`, `scripts/import-spotify-config.test.mjs`

**Interfaces:**
- Produces: `AppConfig { spotifyClientId: string; spotifyRedirectUri: string }` and `getConfig(): AppConfig`.
- Produces: `npm run import:spotify-config`, which writes `.env.local` with only `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI`.

- [ ] **Step 1: Create the package manifest and Vite/TypeScript test scaffold**

  Use React production dependencies, Vite/TypeScript/PWA/test development dependencies, and scripts named `dev`, `build`, `test`, `test:run`, `lint`, `typecheck`, `preview`, and `import:spotify-config`.

- [ ] **Step 2: Write configuration tests**

  ```ts
  expect(() => getConfig({ VITE_SPOTIFY_CLIENT_ID: '' })).toThrow('VITE_SPOTIFY_CLIENT_ID');
  expect(() => getConfig({ VITE_SPOTIFY_CLIENT_ID: 'public-id', VITE_SPOTIFY_CLIENT_SECRET: 'never' })).toThrow('client secret');
  expect(getConfig({ VITE_SPOTIFY_CLIENT_ID: 'public-id', VITE_SPOTIFY_REDIRECT_URI: 'https://muse.example/auth/callback' }))
    .toEqual({ spotifyClientId: 'public-id', spotifyRedirectUri: 'https://muse.example/auth/callback' });
  ```

- [ ] **Step 3: Run the focused tests and confirm they fail before implementation**

  Run `npm test -- src/config.test.ts scripts/import-spotify-config.test.mjs`; expect missing-module or missing-export failures.

- [ ] **Step 4: Implement strict public configuration and the migration script**

  `getConfig` must reject any key containing `CLIENT_SECRET`, default the redirect URI to `${location.origin}/auth/callback`, and return only the client ID and redirect URI. The migration script must parse `../SpotifyTuner/backend/.env`, select only `SPOTIFY_CLIENT_ID`, and write an ignored `.env.local` without printing the value.

- [ ] **Step 5: Install dependencies, run tests, typecheck, and commit**

  Run `npm install`, `npm test -- src/config.test.ts scripts/import-spotify-config.test.mjs`, and `npm run typecheck`; expect success. Commit as `chore: scaffold Muse PWA safely`.

## Task 2: PKCE Authentication and Session Lifecycle

**Files:**
- Create: `src/auth/pkce.ts`, `src/auth/session.ts`, `src/auth/AuthProvider.tsx`
- Create: `src/pages/LoginPage.tsx`, `src/pages/AuthCallbackPage.tsx`
- Test: `src/auth/pkce.test.ts`, `src/auth/session.test.ts`, `src/auth/AuthProvider.test.tsx`

**Interfaces:**
- Produces: `createAuthorizationRequest(config, returnTo): Promise<string>`.
- Produces: `exchangeAuthorizationCode(code, verifier, config): Promise<SpotifySession>`.
- Produces: `useAuth(): { status; session; signIn; signOut; getAccessToken }`.

- [ ] **Step 1: Write failing PKCE and callback tests**

  Test verifier length/charset, SHA-256 challenge encoding, state validation, original-route restoration, one-shot token refresh, denied consent, and session clearing after refresh failure.

- [ ] **Step 2: Verify the authentication tests fail for missing modules**

  Run `npm test -- src/auth`; expect missing-module failures.

- [ ] **Step 3: Implement PKCE primitives and browser session storage**

  Use `crypto.getRandomValues`, `crypto.subtle.digest('SHA-256', ...)`, base64url encoding, `sessionStorage` for temporary verifier/state, and `localStorage` for the renewable Spotify session. Persist no client secret and remove callback query parameters after processing.

- [ ] **Step 4: Implement `AuthProvider`, sign-in, callback, refresh, and logout**

  Request scopes `streaming`, `user-read-email`, `user-read-private`, `user-library-read`, `playlist-read-private`, `playlist-read-collaborative`, `user-read-playback-state`, `user-modify-playback-state`, and `user-read-currently-playing`. Deduplicate concurrent refreshes and redirect classified failures through the typed failure helper.

- [ ] **Step 5: Run auth tests, typecheck, and commit**

  Run `npm test -- src/auth src/pages/AuthCallbackPage.test.tsx` and `npm run typecheck`; expect success. Commit as `feat: add Spotify PKCE authentication`.

## Task 3: Typed Spotify API and Library Repository

**Files:**
- Create: `src/spotify/types.ts`, `src/spotify/api.ts`, `src/spotify/library.ts`
- Create: `src/test/spotifyFixtures.ts`
- Test: `src/spotify/api.test.ts`, `src/spotify/library.test.ts`

**Interfaces:**
- Produces: `SpotifyApiClient.request<T>(path, init?): Promise<T>`.
- Produces: `LibraryRepository` methods `getSavedTracks`, `getSavedAlbums`, `getPlaylists`, `getPlaylist`, `getAlbum`, and `search`.
- Produces normalized `Track`, `Album`, `Playlist`, `Page<T>`, and `SearchResults` types.

- [ ] **Step 1: Write failing transport and normalization tests**

  Test bearer headers, a single retry after 401 refresh, `Retry-After` parsing on 429, abort behavior, null image/artists handling, deduplication during pagination, and normalized resource-not-found errors.

- [ ] **Step 2: Verify API tests fail before implementation**

  Run `npm test -- src/spotify`; expect missing-module failures.

- [ ] **Step 3: Implement the API client and closed response types**

  Use `https://api.spotify.com/v1`, injected `getAccessToken`, `fetch`, and `AbortSignal`. Never log response headers or bodies. Return typed failures rather than raw exceptions.

- [ ] **Step 4: Implement repository caching and pagination**

  Keep a route-keyed in-memory cache for the current session, cancel stale search requests, and merge pages by Spotify ID while retaining the server's `next` URL.

- [ ] **Step 5: Run repository tests, typecheck, and commit**

  Run `npm test -- src/spotify` and `npm run typecheck`; expect success. Commit as `feat: add typed Spotify library data`.

## Task 4: Failure Taxonomy and Dedicated Redirect Pages

**Files:**
- Create: `src/failures.ts`, `src/pages/FailurePage.tsx`, `src/pages/FailurePage.test.tsx`
- Modify: `src/App.tsx`, `src/styles.css`

**Interfaces:**
- Produces: `FailureCode = 'auth' | 'account' | 'device' | 'network' | 'rate-limit' | 'service' | 'browser' | 'not-found'`.
- Produces: `toFailureLocation(failure): { pathname; state }` with a safe, closed payload.
- Produces: one route at `/failure/:code` rendered by `FailurePage`.

- [ ] **Step 1: Write failing redirect and injection-safety tests**

  Assert every failure code shows a title, issue, and primary action; invalid codes become `not-found`; raw query error text is ignored; retry is disabled until a safe rate-limit timestamp; focus lands on the heading.

- [ ] **Step 2: Verify failure tests fail before implementation**

  Run `npm test -- src/pages/FailurePage.test.tsx`; expect missing-component failures.

- [ ] **Step 3: Implement the closed failure catalog and redirect helper**

  Store fixed copy and recovery action metadata in code. Route state may contain only `code`, `returnTo`, `retryAt`, and `correlationId`; sanitize `returnTo` to same-origin application paths.

- [ ] **Step 4: Implement the Quiet Library diagnostic screen**

  Render the music-note mark, explicit failure label, issue explanation, safe code, primary recovery button, and secondary return action. Include offline and rate-limit-specific behavior without automatic retry loops.

- [ ] **Step 5: Run tests, accessibility assertions, and commit**

  Run `npm test -- src/pages/FailurePage.test.tsx` and `npm run typecheck`; expect success. Commit as `feat: add diagnostic redirect pages`.

## Task 5: Playback SDK Provider and Persistent Player

**Files:**
- Create: `src/playback/spotify-sdk.d.ts`, `src/playback/PlaybackProvider.tsx`, `src/playback/PlayerBar.tsx`
- Test: `src/playback/PlaybackProvider.test.tsx`, `src/playback/PlayerBar.test.tsx`

**Interfaces:**
- Produces: `usePlayback(): PlaybackContextValue` with `playUris`, `playContext`, `togglePlay`, `next`, `previous`, `seek`, `setVolume`, `setShuffle`, and `setRepeat`.
- Consumes: `useAuth().getAccessToken` and `SpotifyApiClient`.

- [ ] **Step 1: Write failing SDK lifecycle and control tests**

  Test script loading once, ready/device ID, account and initialization errors, disconnect cleanup, playback transfer on first user action, control delegation, position updates, restrictions, and error redirects.

- [ ] **Step 2: Verify playback tests fail before implementation**

  Run `npm test -- src/playback`; expect missing-module failures.

- [ ] **Step 3: Implement typed SDK loading and `PlaybackProvider`**

  Load `https://sdk.scdn.co/spotify-player.js` only after authentication, connect one player instance, expose stable commands, and classify SDK errors without logging tokens.

- [ ] **Step 4: Implement the accessible persistent `PlayerBar`**

  Include artwork, track/artist labels, shuffle, previous, play/pause, next, repeat, seek, elapsed/duration, and volume. Disable restricted actions and provide keyboard-operable range inputs.

- [ ] **Step 5: Run playback tests, typecheck, and commit**

  Run `npm test -- src/playback` and `npm run typecheck`; expect success. Commit as `feat: add Spotify browser playback`.

## Task 6: Quiet Library Shell and Product Screens

**Files:**
- Create: `src/layout/AppShell.tsx`
- Create: `src/components/AlbumCard.tsx`, `src/components/PlaylistCard.tsx`, `src/components/TrackList.tsx`, `src/components/AsyncState.tsx`
- Create: `src/pages/HomePage.tsx`, `src/pages/SearchPage.tsx`, `src/pages/TracksPage.tsx`, `src/pages/AlbumsPage.tsx`, `src/pages/PlaylistsPage.tsx`, `src/pages/PlaylistPage.tsx`, `src/pages/AlbumPage.tsx`
- Modify: `src/App.tsx`, `src/styles.css`
- Test: `src/pages/library-pages.test.tsx`, `src/layout/AppShell.test.tsx`

**Interfaces:**
- Consumes: `LibraryRepository`, `useAuth`, and `usePlayback`.
- Produces: responsive product routes and reusable play actions for track/context URIs.

- [ ] **Step 1: Write failing route and screen-state tests**

  Test authenticated route protection, navigation, loading, empty results, pagination, debounced/cancelled search, album/playlist details, playback actions, inline recoverable errors, and fatal redirects.

- [ ] **Step 2: Verify screen tests fail before implementation**

  Run `npm test -- src/pages/library-pages.test.tsx src/layout/AppShell.test.tsx`; expect missing-component failures.

- [ ] **Step 3: Implement the shell and reusable collection components**

  Build the approved sidebar, Muse note mark, top search affordance, spacious content area, album/playlist cards, accessible track list, and persistent player placement without nested card clutter.

- [ ] **Step 4: Implement every product route with normalized repository data**

  Preserve pagination and search state during navigation, use inline empty/retry states when context remains useful, and route fatal classified errors to their dedicated page.

- [ ] **Step 5: Complete responsive and accessible Quiet Library styling**

  Use warm neutral tokens, charcoal text, muted accent colors, editorial serif headings, system sans-serif controls, visible focus, reduced motion, a compact sidebar rail below 900px, and stacked track rows below 680px.

- [ ] **Step 6: Run screen tests, typecheck, lint, and commit**

  Run `npm test -- src/pages src/layout`, `npm run typecheck`, and `npm run lint`; expect success. Commit as `feat: build Quiet Library experience`.

## Task 7: PWA Assets, Offline Behavior, and Production Hosting

**Files:**
- Modify: `vite.config.ts`, `index.html`, `src/main.tsx`, `src/styles.css`
- Create: `public/icons/muse-192.png`, `public/icons/muse-512.png`, `public/icons/muse-maskable-512.png`
- Create: `public/_headers`, `vercel.json`, `src/pwa.ts`, `src/pwa.test.ts`

**Interfaces:**
- Produces: installable manifest, application-shell service worker, update prompt, offline redirect, SPA rewrite, and security headers.

- [ ] **Step 1: Write failing PWA behavior tests**

  Test update availability, user-confirmed activation, offline redirect with preserved destination, and absence of Spotify API/token/audio cache rules.

- [ ] **Step 2: Verify PWA tests fail before implementation**

  Run `npm test -- src/pwa.test.ts`; expect missing-module failures.

- [ ] **Step 3: Implement manifest, icons, and safe service-worker caching**

  Configure standalone display, Muse name/colors/icons, navigation fallback, versioned static-asset precache, and explicit network-only handling for Spotify API, Accounts, SDK, callbacks, and audio origins.

- [ ] **Step 4: Add production rewrite and security configuration**

  Rewrite non-asset routes to `index.html`; set CSP, Referrer-Policy, X-Content-Type-Options, Permissions-Policy, and frame protection while allowing only required Spotify HTTPS and WebSocket origins.

- [ ] **Step 5: Run PWA tests and inspect the production build**

  Run `npm test -- src/pwa.test.ts` and `npm run build`; expect generated manifest, service worker, icons, and successful build with no source maps.

- [ ] **Step 6: Commit**

  Commit as `feat: make Muse production installable`.

## Task 8: End-to-End Verification and Operator Documentation

**Files:**
- Create: `README.md`
- Create: `docs/spotify-setup.md`, `docs/chromebook-install.md`
- Modify: `.env.example`

**Interfaces:**
- Produces: exact Spotify dashboard redirect setup, production deployment steps, Chromebook installation steps, security notes, and failure-page verification matrix.

- [ ] **Step 1: Document configuration without credential values**

  Explain Spotify app creation, Premium requirement, exact redirect URI registration, `npm run import:spotify-config`, local HTTPS/production expectations, deployment, and key rotation. State explicitly that the client secret is unused and must not enter the PWA.

- [ ] **Step 2: Run the safe configuration importer**

  Run `npm run import:spotify-config`; expect a success message that names copied variable keys but never their values. Confirm `.env.local` is ignored and contains no `SECRET` key.

- [ ] **Step 3: Run the complete automated verification suite**

  Run `npm run lint`, `npm run typecheck`, `npm run test:run`, and `npm run build`; expect zero errors, zero failing tests, and a production `dist` directory.

- [ ] **Step 4: Inspect the bundle for secret leakage**

  Search source, tracked files, and `dist` for `SPOTIFY_CLIENT_SECRET`, the original secret value through a non-printing equality check, `.env.local`, raw authorization headers, and source maps; expect no secret matches and no `.map` files.

- [ ] **Step 5: Perform browser verification at Chromebook dimensions**

  Run the production preview, verify sign-in/error routes without exposing credentials, inspect 1366×768 and narrow responsive layouts, test keyboard focus and reduced motion, and confirm installability metadata.

- [ ] **Step 6: Review git state and commit documentation**

  Run `git status --short`, review tracked files, and commit as `docs: add Muse setup and release guide`.

- [ ] **Step 7: Record live-account boundary honestly**

  If the Spotify dashboard redirect URI and HTTPS deployment are not yet active, report automated and local production verification as complete while identifying live Spotify playback and Chromebook installation as user-environment acceptance checks rather than claiming they passed.
