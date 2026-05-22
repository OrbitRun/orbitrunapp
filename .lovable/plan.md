## Plan

### 1) Make GPS tracking deterministic instead of best-effort
- Change the run start flow so the app does **not** start the countdown/run until it has a usable first GPS fix, or shows a clear error if iOS does not return one.
- Reuse that first fix as the first route point so the map begins drawing immediately when the run starts.
- Loosen the first-fix gate slightly: accept the first coordinate up to a practical accuracy threshold, then tighten filtering for later points.
- Add visible GPS states on the run page: “henter GPS”, “klar”, “svagt signal”, or the real native error message.
- Fix the native GPS error logging so TestFlight/Xcode tells us whether the plugin returns permission, timeout, unavailable, or accuracy errors.

### 2) Keep the map usable on small screens
- Keep the FocusRun-style flexible map during active runs.
- On the start screen, make the map height responsive with a bigger upper limit, but reserve space for stats and the Start button so it never goes under the bottom navigation.

### 3) Make Spotify stop blocking the core app
- Keep the existing Spotify support, but make the auth flow more diagnosable: show the exact callback/token/playlists error in-app and in logs.
- Add a “nulstil Spotify-login” path that clears token + PKCE verifier + selected playlist before starting over, so stale/verifier-mismatch states cannot keep looping.
- If the custom scheme callback is still unreliable, switch the native redirect to the already-supported web callback route as a fallback: Spotify returns to the website, which then opens the app with a clean handoff.

### 4) Update setup docs so TestFlight build is not guessing
- Correct the iOS setup doc to match the current `CapacitorHttp.enabled = false` decision for Mapbox.
- Add a short TestFlight verification checklist: GPS must log first fix before countdown; Spotify must log deep link + token exchange + playlist API result.

## Technical details
- Main files: `src/hooks/use-run-tracker.ts`, `src/components/RunMap.tsx`, `src/routes/index.tsx`, `src/lib/geolocation-native.ts`, `src/lib/spotify.ts`, `src/components/MusicIntegrationSection.tsx`, `src/components/SpotifyPlaylistPicker.tsx`, `docs/IOS_SETUP.md`.
- Biggest GPS change: `armGps()` should return/resolve the first valid position instead of only starting a watcher asynchronously, and `beginCountdown()` should wait for that result before launching countdown.
- Biggest Spotify change: clear both `pulse.spotify.token` and `pulse.spotify.verifier` on reset/reauth, then surface the actual failing status/message rather than silently returning to “connect again”.