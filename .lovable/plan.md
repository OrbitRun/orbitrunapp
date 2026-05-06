## Problems

1. **Playlist won't play** — Today the chosen playlist only starts when the `orbit:run-start` event fires (i.e. when a run actually begins). Tapping the ▶ Play button in the music card just calls Spotify's generic "resume", which plays whatever was last queued in Spotify — not the playlist the user picked. Tapping the playlist row only opens the picker; there is no way to start the selected playlist on demand.
2. **Picker is see-through** — `SpotifyPlaylistPicker` uses `glass-strong`, which is a translucent blur. On the run screen the map and controls bleed through and the list is hard to read.

## Plan

### 1. Make Play actually start the chosen playlist (`src/components/MusicHub.tsx`)
- Extract the existing run-start logic into a reusable `startActivePlaylist()` helper that:
  - Reads `getActiveWorkoutPlaylist()`
  - Picks an active device, or transfers to the first available device (the current iPhone if the Web Playback SDK / Spotify app is open)
  - Calls `playContext(playlist.uri, deviceId)`
  - Falls back to plain `spPlay()` if no playlist is selected
  - Surfaces 403 → "Premium required" toast and 404 → "No active device" toast through the existing `handleSpotifyError`
- Wire the ▶ Play button so that when nothing is playing **and** a playlist is selected, it calls `startActivePlaylist()` instead of `spPlay()`. If something is already playing, keep current pause/resume behaviour.
- Make the playlist row itself a "tap to play" affordance: short tap on the row when a playlist is selected → `startActivePlaylist()`; long-press or a small pencil icon → opens the picker. (Simpler alternative: keep tap = open picker, but add a small ▶ button on the right of the row that triggers `startActivePlaylist()`. We'll go with this — it's clearer and avoids gesture ambiguity.)
- Reuse `startActivePlaylist()` from the `orbit:run-start` listener so behaviour stays identical between manual and automatic start.

### 2. Solid background for the playlist picker (`src/components/SpotifyPlaylistPicker.tsx`)
- Replace `glass-strong` on the sheet container with a solid surface: `bg-background` (or `bg-card`) plus `border border-white/10` and a stronger `shadow-2xl`. Keep the rounded sheet shape and the dark backdrop overlay (`bg-black/70`) for focus.
- Ensure the list rows still have visible hover states against the solid background (swap `hover:bg-white/5` → `hover:bg-muted`).
- No change to logic, scope checks, or i18n strings.

### 3. i18n
- Add a tiny string `music.playPlaylistNow` ("Afspil nu" / "Play now") for the new ▶ button tooltip/aria-label, in `src/lib/i18n.tsx`.

## Files touched
- `src/components/MusicHub.tsx` — extract `startActivePlaylist`, hook it to Play button + new row ▶ button, reuse in run-start listener.
- `src/components/SpotifyPlaylistPicker.tsx` — solid background + hover tweaks.
- `src/lib/i18n.tsx` — one new key (da/en).

No backend, no Spotify scope, no schema changes.
