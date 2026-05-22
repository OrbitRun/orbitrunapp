## Hvad der ændres

### 1) Sort kort i TestFlight
`capacitor.config.ts` har `CapacitorHttp.enabled: true`, som patcher `window.fetch` + `XMLHttpRequest` globalt. Mapbox GL henter vektor-tiles som binær `ArrayBuffer` i en Web Worker — CapacitorHttp returnerer base64-strenge i stedet, så tiles aldrig dekoder → kun den sorte baggrund vises.

Vi bruger allerede `CapacitorHttp.request(...)` direkte i `src/lib/native-http.ts` for Spotify/Open-Meteo, så vi har ikke brug for den globale patch. Vi slår den fra.

### 2) Spotify hænger på "Forbinder…"
Symptomet (hverken success- eller error-toast efter Spotify-godkendelse) betyder at `appUrlOpen` ikke når frem til JS — typisk fordi SFSafariViewController (via `@capacitor/browser`) ikke pålideligt overleverer custom-scheme redirects på iOS 17/18.

Vi skifter på native til at åbne autorisations-URL'en i **system-Safari** via `App.openUrl(...)`. Det er den eneste sti Apple garanterer leverer deep-link tilbage via `appUrlOpen`, og fjerner Browser.close()-race'en helt. Vi tilføjer også:
- Synkron listener-registrering i `initSpotifyDeepLinkListener` (ikke inde i en async IIFE), så vi aldrig misser en URL.
- Diagnostiske `console.log` linjer på modtaget URL, parse, exchange-status og dispatched event — så hvis det stadig hænger kan vi læse Xcode-logs.
- Kortere safety-timeout (15s) + poll på `isAuthed()` i `MusicIntegrationSection`, så UI'et opdaterer selv hvis et event mistes men token blev gemt.

### 3) Løbesiden passer ikke i skærmen — Start-knap under bottom nav
`src/routes/index.tsx` har `<RunMap className="h-[221px]" />` plus fem stat-tiles + splits + en stor Start-knap. På en 390×688 viewport (iPhone 13/14/15) skubber det Start-knappen ind under den faste `BottomNav`.

Vi løser det med to small, fokuserede UI-ændringer:
- Gør kort-højden responsiv: `h-[180px] sm:h-[221px]` så vi vinder ~40px på små telefoner.
- Tilføj `pb-28` på `<main>` i `src/routes/index.tsx` så indholdet altid kan scrolle fri af `BottomNav` uanset enhed.

## Filer der ændres
- `capacitor.config.ts` — `CapacitorHttp.enabled: false`
- `src/lib/spotify.ts` — `App.openUrl` på native, synkron listener, diagnostiske logs
- `src/components/MusicIntegrationSection.tsx` — 15s safety + 2s poll på `isAuthed()`
- `src/routes/index.tsx` — `pb-28` på main, mindre kort-højde
- `src/components/RunMap.tsx` — (ingen — højden styres via prop fra index)

## Hvad du skal gøre bagefter
1. `npm run build`
2. `npx cap sync ios`
3. Bump build-nummer i Xcode → Archive → upload til TestFlight
4. Installér ny build på telefonen:
   - Tryk **Forbind** under Musik-integration: system-Safari åbner (ikke længere et in-app sheet), godkend → iOS spørger "Åbn i Orbit Run?" → tryk Åbn → status skifter til "Spotify · Connected".
   - Kortet skal nu vise mørk Mapbox-style med den pulserende neon-prik, og Start-knappen ligger over `BottomNav`.
5. Hvis kortet stadig er sort: åbn Xcode → Window → Devices and Simulators → vis konsol-log og send linjer med `mapbox`/`run-line` til mig.
