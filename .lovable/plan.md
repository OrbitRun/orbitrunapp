## Problem

Safari redirects back via `jonas-orbit-run://callback?code=...`, iOS routes the URL to the app, but the UI stays on "Connecting Spotify…" and never completes the token exchange.

The "Connecting Spotify…" copy only exists in `src/routes/spotify.callback.tsx` — the **web** callback page. That tells us one of two things is happening on the device:

1. The auth request was started with the **web** `redirect_uri` (`https://orbitrunapp.lovable.app/spotify/callback`) instead of the native one. Spotify then redirects the in‑app SFSafariViewController to that web URL, which renders "Connecting Spotify…" inside Safari — completely isolated from the host app's `localStorage`. The token is written into Safari's storage and lost when the user closes the sheet.
2. The native scheme is used, but the `appUrlOpen` event arrives before `App.addListener` finishes registering (race during cold start), so the code is dropped on the floor.

We need to make both paths bullet‑proof.

## Plan

### 1. Force the native redirect URI deterministically

In `src/lib/spotify.ts`:

- Replace the `window.Capacitor?.isNativePlatform?.()` probe with a check that also accepts `window.Capacitor?.getPlatform?.() === "ios" | "android"` and caches the result. Some Capacitor 8 builds don't expose `isNativePlatform` until after `DOMContentLoaded`.
- Log the resolved `redirect_uri` to the console in `beginAuth()` so the user can verify in Xcode's console which URI was actually sent to Spotify.

### 2. Catch the deep link even on cold start

Currently `initSpotifyDeepLinkListener` only attaches `appUrlOpen`. If iOS launches the app *because* of the URL, the event fires before React mounts, so `addListener` misses it.

- After registering `appUrlOpen`, also call `App.getLaunchUrl()` and process the same handler with that URL when it starts with `jonas-orbit-run://`.
- Move the listener registration out of an IIFE so it awaits before returning. The cleanup function will still work (we keep the resolved handle in a ref).

### 3. Make the deep‑link handler resilient

- Accept the code from `searchParams`, fragment, *and* a manual regex fallback (`/[?&#]code=([^&]+)/`) for iOS edge cases where `new URL(...)` for custom schemes drops the query on older iOS versions.
- Wrap `exchangeCode` in a try/catch and log a clear error so we can see in Xcode if the token endpoint call itself is the failure (rules out the "stuck on Connecting" being a fetch hang).
- After a successful exchange, also `router.navigate({ to: "/" })` (via a window event the root listens to) so any stray Safari sheet that came back to the app is cleared.

### 4. Guard the web `/spotify/callback` route on native

In `src/routes/spotify.callback.tsx`, if `isCapacitorNative()` is true on mount, immediately redirect to `/` and show "Returning to Orbit Run…". This prevents the confusing "Connecting Spotify…" from appearing inside the app's WKWebView if any flow ever lands there natively.

### 5. CORS

`https://accounts.spotify.com/api/token` does **not** require CORS for `application/x-www-form-urlencoded` POSTs from a WKWebView (Spotify explicitly supports PKCE from browsers). No proxy needed. We will only add diagnostic logging to confirm the response status.

### 6. Manual checklist for the user (in `docs/IOS_SETUP.md`)

Add a short troubleshooting block:

- In Spotify Developer Dashboard → Redirect URIs, **`jonas-orbit-run://callback` must be present** (exact, no trailing slash). The web URI alone is not enough for the iOS build.
- After changing Redirect URIs in Spotify, wait ~30 s before retrying (Spotify caches).
- Delete the app from the device and reinstall after changing `Info.plist` — iOS caches URL scheme registrations.

## Files to change

- `src/lib/spotify.ts` — robust native detection, `getLaunchUrl` handling, fragment/regex code parsing, diagnostic logs.
- `src/routes/spotify.callback.tsx` — native guard.
- `docs/IOS_SETUP.md` — Spotify dashboard checklist.

No package or Capacitor config changes required.
