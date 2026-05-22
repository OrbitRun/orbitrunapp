# Plan: kortlayout, GPS-lokation og Spotify-flow

## 1) Kortet viser standardlokation (London) i stedet for din

**Årsag:** `RunMap` initialiserer med `center: [-0.09, 51.505]` (Borough Market) og flytter først kameraet når dens egen `userLoc` watcher leverer et fix. Når app'en kommer tilbage fra Spotify-Safari, eller når permission-prompt'en er i "prompt"-tilstand, kan `nativeGetCurrentPosition()` returnere `null` og `nativeWatchPosition` aldrig levere et fix — så kameraet bliver hængende på London. Derudover bruger run-trackerens `points`-array ikke at opdatere kameraet før løbet er startet.

**Fix i `src/components/RunMap.tsx`:**
- Skift default `center` til en geografisk neutral position (f.eks. `[10.2, 56.15]` for Danmark) så fallback'et ikke ser ud som London.
- Når permission'en er `prompt`, vent og retry `nativeGetCurrentPosition()` op til 3 gange med 1s mellemrum.
- Cache sidste kendte `userLoc` i `localStorage` og brug den som initielt center, så kortet åbner på din sidste lokation i stedet for default.
- Tilføj `console.log("[map] userLoc fix", lat, lng)` så vi kan verificere i Xcode-konsollen.
- Når `t.points[0]` ankommer (løbet starter), pan til det punkt med det samme i `index.tsx` (sker allerede via render path, men sørg for `fittedOnceRef` ikke blokerer ved første punkt).

## 2) Dynamisk korthøjde så Start-knappen altid er synlig

**Mål:** Kortet krymper på små skærme præcis som på Focus Run-siden, og Start-knappen ligger aldrig under bottom nav.

**Fix i `src/routes/index.tsx`:**
- Erstat fixed `h-[180px] sm:h-[221px]` med en clamp baseret på viewport-højden:
  ```
  className="h-[clamp(140px,22dvh,240px)] w-full"
  ```
  for både map-wrapperen og indoor-preview-wrapperen.
- Bevar `[padding-bottom:calc(env(safe-area-inset-bottom)+6rem)]` på `<main>` så Start-knappen altid har plads over `BottomNav`.
- På meget små skærme (<700px højde) reducer også `mt-4`/`mt-3` mellemrum mellem map → edit-bar → hero-stats → secondary-stats → Start-knap (brug `sm:mt-4` mønster).

## 3) Spotify "Forbinder…" giver op for tidligt + playlister vises ikke

**Årsag 1 — timeout:** Safety-timeout i `MusicIntegrationSection.tsx` er 15s. På iOS tager system-Safari + Spotify-login + "Åbn i Orbit Run?"-prompten ofte længere, især første gang. Brugeren vender tilbage efter `appUrlOpen` er fyret men spinneren er allerede nulstillet → de tror det fejlede og trykker Connect igen, hvilket starter en ny PKCE-runde med ny verifier → forrige token-exchange fejler.

**Fix:**
- Forlæng safety-timeout fra 15s til 3 minutter, så brugeren har tid til at gennemføre flow'et.
- Pollen på `isAuthed()` hver 2s rydder spinneren straks når token er på plads — så den lange timeout påvirker kun cancel-tilfælde.
- Tilføj re-check på `window`-fokus event: når app'en kommer tilbage til forgrunden, tjek `isAuthed()` og ryd spinner hvis token er gemt.

**Årsag 2 — playlister tomme:** Hvis et gammelt token uden `playlist-read-private` scope stadig ligger i Preferences-storage, sætter `hasPlaylistScope()` straks `needsReauth=true` og henter aldrig playlister. Eller `getMyPlaylists()` kaster fejl der bliver swallowed til en generisk besked uden detalje.

**Fix i `src/components/SpotifyPlaylistPicker.tsx` og `src/lib/spotify.ts`:**
- Log faktisk fejl-detalje fra `getMyPlaylists()` i `console.error` så vi kan se den i Xcode.
- Vis status-kode + besked i UI'et i stedet for kun "playlist load error".
- Hvis token mangler scope, kald `logout()` automatisk før `beginAuth()` så ny PKCE-runde starter ren.

## 4) Verifikation efter build

1. `npm run build && npx cap sync ios`, bump build-nummer i Xcode, Archive → TestFlight.
2. Test 1 (kort): Åbn app → kortet centrerer på din lokation indenfor få sekunder, ikke London. Tryk Start Løb → distance begynder at tikke.
3. Test 2 (layout): Drej iPhone i landscape eller test på mindre device — Start Løb-knappen er stadig synlig over bottom nav, kortet krymper.
4. Test 3 (Spotify): Tryk Connect → Safari åbner → Login → "Åbn i Orbit Run?" → tilbage til app, "Forbinder…" forsvinder hurtigt → "Spotify · Connected". Tryk "Vælg playliste" → playlister vises.
5. Hvis noget stadig fejler: åbn Xcode-konsollen filtreret på `[spotify]` eller `[map]` og send loggen.

## Filer der ændres

- `src/components/RunMap.tsx` — default center, cached last location, retry på "prompt".
- `src/routes/index.tsx` — clamp height på map-section.
- `src/components/MusicIntegrationSection.tsx` — 3-minutters safety-timeout + focus-event re-check.
- `src/components/SpotifyPlaylistPicker.tsx` — bedre fejl-rapportering.
- `src/lib/spotify.ts` — log playlist fetch fejl + auto-logout før re-auth ved scope-mismatch.
