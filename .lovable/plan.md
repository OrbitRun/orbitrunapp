## Mål
Lad brugeren vælge en Spotify-playliste i Orbit Run, som starter automatisk ved træningsstart — med automatisk device-valg og pæn fejlhåndtering for non-Premium.

## Ændringer

### 1. `src/lib/spotify.ts` — nye API-funktioner
- `getMyPlaylists(limit=50)` → `GET /me/playlists` (returnerer `{id, name, uri, imageUrl, owner}[]`, paginering hvis >50).
- `playContext(contextUri, deviceId?)` → `PUT /me/player/play` med body `{ context_uri }` (+ `?device_id=` hvis givet).
- `getDevices()` → `GET /me/player/devices` (returnerer liste).
- `transferPlayback(deviceId, play=false)` — refaktorering af eksisterende `transferToFirstDevice` så den genbruges.
- Lokal storage helpers:
  - `getActiveWorkoutPlaylist()` / `setActiveWorkoutPlaylist({uri, name, imageUrl} | null)` — nøgle `pulse.spotify.active_workout_playlist`.
- Ekstra scope: tilføj `playlist-read-private` og `playlist-read-collaborative` til `SPOTIFY_SCOPES`. Brugere der allerede er forbundet skal genforbinde for at få adgang til private playlister (vis hint i UI hvis 403 ved hentning).

### 2. Ny komponent `src/components/SpotifyPlaylistPicker.tsx`
- Modal/sheet (genbrug `ui/sheet` eller `ui/dialog`).
- Henter playlister via `getMyPlaylists`, viser cover + navn + ejer i en scrollbar liste.
- Klik = gem som aktiv + luk. Viser "Vælg ingen" for at nulstille.
- States: loading (OrbitSpinner), tom liste, fejl (re-auth hint hvis 401/403).

### 3. `src/components/MusicHub.tsx` — integration
- Når connected: tilføj en lille knap/række under titlen der viser:
  - Hvis ingen valgt: "Vælg træningsplayliste" → åbner picker.
  - Hvis valgt: lille cover + playliste-navn + "skift"-knap → åbner picker.
- Tilføj entry i `showMenu`-popoveren: "Skift playliste".

### 4. Auto-start logik — `MusicHub.tsx` `onStart`-handler
Erstat nuværende `runControl(spPlay)` ved `orbit:run-start` med ny flow:
```
const playlist = getActiveWorkoutPlaylist();
if (!playlist) → fald tilbage til spPlay() (eksisterende adfærd)
else:
  1. tjek devices via getDevices()
  2. hvis ingen aktiv device → transferPlayback(firstDevice.id, false)
  3. playContext(playlist.uri, deviceId)
  4. fang 403 → vis premium-toast (eksisterende `handleSpotifyError`)
  5. fang 404 (no device) → toast "Åbn Spotify på din enhed"
```

### 5. Løbeskærm — vis aktiv playliste
- I `MusicHub`-kortet (som vises på index/løbesiden) tilføjes navnet på den valgte playliste i den lille række beskrevet i punkt 3. Det dækker kravet om at brugeren ser hvad der vil blive afspillet.
- Ingen ændringer i `FocusRunView` nødvendige (MusicHub er allerede synlig i hub'en).

### 6. i18n — `src/lib/i18n.tsx`
Tilføj nøgler (DA + EN):
- `music.choosePlaylist` — "Vælg træningsplayliste" / "Choose workout playlist"
- `music.changePlaylist` — "Skift playliste" / "Change playlist"
- `music.noPlaylists` — "Ingen playlister fundet"
- `music.playlistLoadError` — fejlbesked + reconnect-hint
- `music.premiumPlaylistHint` — "Premium kræves for at starte playliste automatisk. Åbn Spotify manuelt — skip/play virker stadig."
- `music.willPlay` — "Afspiller: {name}"

### 7. Fejlhåndtering Premium
- Eksisterende 403-håndtering i `handleSpotifyError` udvides: ved auto-start vises `music.premiumPlaylistHint` (én gang per session, samme `premiumWarned` ref-mønster).
- Manuelle play/pause/skip-knapper bevares uændret (de virker for nogle non-premium konti i visse markeder, og fejler pænt ellers).

## Tekniske detaljer
- Alt er klient-side; ingen backend-ændringer, ingen nye secrets, ingen DB.
- Ny scope kræver re-auth → tilføj kode der detekterer manglende scope i token (`scope`-string) og viser "Genforbind for at vælge playlister" knap i picker.
- Storage er `localStorage` (samme mønster som token).
- Ingen ændring til `src/routes/spotify.callback.tsx`.

## Filer
- redigér: `src/lib/spotify.ts`, `src/components/MusicHub.tsx`, `src/lib/i18n.tsx`
- ny: `src/components/SpotifyPlaylistPicker.tsx`
