# Spotify Integration Upgrade

Most of what you asked for is already live in the app:
- Spotify Web API client with PKCE OAuth login (`src/lib/spotify.ts`) — already wired to your Client ID, no backend needed.
- Spotify widget inside Focus Mode (`src/components/FocusRunView.tsx`) showing **album cover, title, artist, Play/Pause, Next/Previous**, plus auto play/pause on run start/stop.

So this plan focuses on the missing pieces: a **"Vælg Musik" playlist selector** on the start screen, a small **visual polish pass** on the Focus Mode widget, and the **API plumbing** to actually start a chosen playlist on tap.

---

## 1. Playlist Selector on Run start screen

**Where:** `src/routes/index.tsx`, between the stats/splits area and the big Start button (replace the current `<MusicHub />` slot, or sit just above it — see "Decision" below).

**New component:** `src/components/PlaylistPicker.tsx`

Renders a "Vælg Musik" section header + a row of **3 minimalist cards**, each:
- Small icon (lucide: `Flame`, `Wind`, `Waves` for Tempo / Easy / Long Run — picked to match the dark/raw style, no album art).
- Playlist name (DA + EN via `i18n`).
- Subtle border, `bg-white/5`, no glow. Active card gets a 1px Spotify-green left edge accent only.
- Tap = start that playlist on the user's active Spotify device.

**Default playlists** (curated Spotify editorial, work for any user):
1. **Tempo** — `spotify:playlist:37i9dQZF1DX35oM5SPECmN` (Beast Mode)
2. **Easy Run** — `spotify:playlist:37i9dQZF1DWSJHnPb1f0X3` (Run Wild)
3. **Long Run** — `spotify:playlist:37i9dQZF1DWZZbwlv3Vmtr` (Power Workout)

(Stored as a `PLAYLISTS` const in the new component — easy to swap later. A future iteration can swap these for the user's own playlists via `GET /me/playlists`.)

**Behavior:**
- Not connected → cards are visible but tapping any opens Spotify connect (`beginAuth()`), with a small "Connect Spotify" hint under the section title.
- Connected, no active device → toast "Open Spotify on a device" + auto-call `transferToFirstDevice()` then retry.
- Connected, active device → start playback immediately and show a tiny "Playing" indicator on the chosen card.

## 2. New API helper in `src/lib/spotify.ts`

Add one function:

```ts
export async function playContext(uri: string): Promise<void> {
  await api("/me/player/play", {
    method: "PUT",
    body: JSON.stringify({ context_uri: uri }),
  });
}
```

Also export an optional `getMyPlaylists()` (returns up to 20) so we can wire the cards to the user's own playlists later without another round-trip.

## 3. Focus Mode widget — visual polish only

The widget already has cover, title, artist, prev / play-pause / next. Two small tweaks to match your brief ("minimalistisk, uden glow, Spotify-grøn kun som accent"):

- Remove the `bg-gradient-to-br from-neon to-...` placeholder behind the cover — replace with flat `bg-white/5` so the cover sits cleanly with no glow.
- Replace the solid neon Play button with a flat `bg-white/10` circle and a **2px Spotify-green dot** (`oklch(0.74 0.18 145)`, added as `--spotify` token) next to the track title as the only green accent. Prev/Next stay as plain icon buttons.
- Tighten typography: title `text-[11px] font-semibold`, artist `text-[10px] text-muted-foreground`. Already mostly there — minor cleanup.

No layout / behavior changes; polling, error handling, "Use this device" all stay.

## 4. Decision needed

`MusicHub` (the existing big Spotify card on the start screen) overlaps with the new playlist selector. Two reasonable options:

- **A — Replace it.** Drop `<MusicHub />` from the start screen. The new "Vælg Musik" section becomes the only Spotify entry point on the home view (still connect button + now-playing strip when authed). Cleaner, less duplication.
- **B — Keep both.** Show `<MusicHub />` (now-playing strip) above the new playlist picker.

I'll go with **A** unless you say otherwise — it matches the minimalistic intent of the brief.

## 5. OAuth — already done

PKCE flow is already implemented (`beginAuth`, `/spotify/callback` route, token refresh). Your Client ID `60749f03c1184bc6905c571975d97208` is wired in. Make sure these redirect URIs are saved in your Spotify Developer Dashboard:

- `https://id-preview--3d047850-7640-45ab-ac2e-13edce4313d1.lovable.app/spotify/callback`
- `https://orbit-lab-running.lovable.app/spotify/callback`

Nothing to change in code for this point.

---

## Files

- **New:** `src/components/PlaylistPicker.tsx`
- **Edit:** `src/lib/spotify.ts` — add `playContext`, optional `getMyPlaylists`
- **Edit:** `src/routes/index.tsx` — replace `<MusicHub />` with `<PlaylistPicker />` (option A)
- **Edit:** `src/components/FocusRunView.tsx` — flat cover bg, neutralize Play button, add green dot accent
- **Edit:** `src/styles.css` — add `--spotify: oklch(0.74 0.18 145)` token
- **Edit:** `src/lib/i18n.tsx` — add keys: `music.pickTitle`, `music.playlist.tempo`, `music.playlist.easy`, `music.playlist.long`, `music.playlist.tempoHint`, etc.
