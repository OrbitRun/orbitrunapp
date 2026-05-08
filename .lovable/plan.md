## Changes

### 1. Profile page — reorder sections
In `src/routes/profile.tsx`:
- Move `<MusicIntegrationSection />` to render **directly after the Premium Member Card** and **before `<ShoesSection />`** (around line 176–177).
- Remove the existing `<MusicIntegrationSection />` placement after `<IntegrationsSection />` (line 302).

New order at top of profile:
```
Member Card
MusicIntegrationSection   ← moved here
ShoesSection
Experience level
…
IntegrationsSection       ← MusicIntegrationSection no longer here
General settings
…
```

### 2. Run screen (`/`) — remove the mini Spotify widget
In `src/routes/index.tsx`:
- Remove the `import MusicHubMini from "@/components/MusicHubMini"` line.
- Remove the `<section className="mt-3"><MusicHubMini /></section>` block (lines 423–425).

### 3. Focus/Run-in-progress screen — restore the richer "old" Spotify player
The previous full `MusicHub` component was deleted in the last refactor. Recreate it as `src/components/MusicHubFull.tsx` matching the prior in-run experience:
- Larger album artwork (≈56×56)
- Track title (Marquee) + artist
- Progress bar with elapsed / total time
- Prev / Play-Pause / Next controls
- Spotify green (#1DB954) accent on the play button
- No playlist selector, no login button (config lives on Profile). If not authed, show a small hint linking to Profile.

In `src/components/FocusRunView.tsx`:
- Replace `import MusicHubMini` with `import MusicHubFull`.
- Replace `<MusicHubMini />` (line 297) with `<MusicHubFull />` in the row below the map.

`MusicHubMini.tsx` remains in the codebase only if used elsewhere; otherwise delete it (it is currently only imported by `index.tsx` and `FocusRunView.tsx`, both of which will stop using it — so delete the file).

### Verification
- Profile: Member card → Music integration (green) → Shoes → Level …
- Home `/`: no Spotify widget visible in idle state.
- Start a run → FocusRunView shows full-size Spotify player with artwork, title, progress bar and prev/play/next controls; tapping play/pause/next controls Spotify on iPhone.
- Auto-start of saved playlist on run start still works (handled by `useSpotifyRunControl`, untouched).
