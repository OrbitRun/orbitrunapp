## Make Spotify Hub live

Wire up the existing Spotify PKCE OAuth client (`src/lib/spotify.ts`) to the `MusicHub` component so users can actually connect their account, see the current track, and control playback.

### What the user needs to do (one-time, ~2 min)

To make this work the app needs a Spotify Client ID (free, no backend required):
1. Go to https://developer.spotify.com/dashboard → "Create app"
2. App name: anything (e.g. "Orbit")
3. Redirect URIs — add BOTH:
   - `https://id-preview--3d047850-7640-45ab-ac2e-13edce4313d1.lovable.app/spotify/callback`
   - `https://orbit-lab-running.lovable.app/spotify/callback`
   - (plus any custom domain `/spotify/callback`)
4. APIs used: "Web API" + "Web Playback SDK"
5. Copy the Client ID and paste it back to me.

I'll then drop it into `src/lib/spotify.ts` (Client ID is publishable — safe in the codebase; no client secret is used since PKCE is used).

Note: Spotify playback control (play/pause/next/previous) requires a **Spotify Premium** account. Free accounts can still authenticate and view what's playing, but transport buttons will fail silently — I'll surface a friendly notice for that case.

### Changes

**1. `src/components/MusicHub.tsx` — replace mock with live Spotify**
- On mount: check `isAuthed()`. If not connected, show a "Connect Spotify" CTA that calls `beginAuth()`.
- If `!isConfigured()` (no Client ID set yet), show a small "Spotify not configured" hint instead of the connect button.
- When connected: poll `getNowPlaying()` every 5s (and immediately on mount + on window `focus`). Stop polling when tab is hidden (`visibilitychange`).
- Display real track title, artist, album art (fallback to current `Music2` icon tile if no artwork), and a live progress bar derived from `progressMs / durationMs`.
- Wire prev / play-pause / next buttons to `previous()`, `play()`/`pause()`, `next()`. Optimistic UI then refresh via `getNowPlaying()`.
- If `getNowPlaying()` returns `hasActiveDevice: false`, show a small "Open Spotify on a device" hint and a "Use this device" button that calls `transferToFirstDevice()`.
- Add a small overflow menu (or long-press the artwork) with "Disconnect" → `logout()`.
- Keep the existing run-start/run-stop event listeners so playback auto-resumes/pauses with the run (call `play()` / `pause()` instead of just toggling local state).
- Remove the "DEMO" badge and the "Spotify integration coming soon" caption.

**2. `src/lib/spotify.ts` — set the real Client ID**
- Replace `SPOTIFY_CLIENT_ID = "REPLACE_WITH_YOUR_SPOTIFY_CLIENT_ID"` with the value the user provides.

**3. `src/routes/spotify.callback.tsx`** — already exists and works; no changes needed.

**4. `src/lib/i18n.tsx`** — add new strings: `music.connect`, `music.connecting`, `music.notConfigured`, `music.noDevice`, `music.useThisDevice`, `music.disconnect`, `music.premiumRequired`. Remove/repurpose `music.demo` and `music.spotifySoon`.

### Technical notes

- Token storage and PKCE flow already work in `src/lib/spotify.ts` — no changes to auth logic needed.
- Polling interval: 5s when visible, paused when hidden, to stay well within Spotify's rate limits.
- All Spotify control calls are wrapped in try/catch; on 403 (Premium required) we toast a one-time "Spotify Premium required for playback control" message.
- No backend, no edge function, no secrets storage — the Client ID is public and the access/refresh tokens live in `localStorage` per the existing code.

### What I need from you to proceed

Reply with your **Spotify Client ID** (and confirm you've added the redirect URIs above). Once I have it I'll ship the changes.