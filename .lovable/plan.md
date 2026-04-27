## Plan: Spotify Hub in Focus mode + remove Musikkilde from Profile

### 1. Replace mock music in FocusRunView
In `src/components/FocusRunView.tsx`:
- Remove the `MOCK_TRACKS`, `musicIdx`, `playing`, and `track` state.
- Replace the music control row (the `glass` bar below the map) with a compact Spotify-powered version using the existing `@/lib/spotify` helpers (`isAuthed`, `isConfigured`, `beginAuth`, `getNowPlaying`, `play`, `pause`, `next`, `previous`, `transferToFirstDevice`).
- Behavior:
  - If not configured / not authed: show a small "Connect Spotify" pill button instead of transport controls.
  - If authed: poll `getNowPlaying()` every 5s (only while focus view is mounted and document visible), show artwork (fallback to Music2 icon), marquee/truncated track title and artist, prev/play-pause/next bound to live Spotify calls.
  - Handle 401 (drop to connect state), 403 (toast: premium required), 404 (toast: no active device, with a "Use this device" fallback action inline).
- Keep the same compact glass row visual style — just swap data source. Neon accents preserved.

### 2. Remove Musikkilde row from Profile
In `src/routes/profile.tsx`:
- Remove the `Headphones` entry from the `[{ Icon: MapPin... }, { Icon: Headphones... }]` array (the "Musikkilde / Music source" row).
- Remove the now-unused `Headphones` import from `lucide-react`.

### 3. No new strings needed
All required i18n keys (`music.connect`, `music.connecting`, `music.premiumRequired`, `music.noDevice`, `music.useThisDevice`, `music.live`, `music.nothingPlaying`) already exist from the previous Spotify integration.

### Files to edit
- `src/components/FocusRunView.tsx`
- `src/routes/profile.tsx`
