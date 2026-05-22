## Problem

Det er ikke et kort-layout problem længere. Screenshotet viser:

- **GPS:** Appen kører som native iOS, men JavaScript kan ikke finde `@capacitor/geolocation` i den aktuelle build. Derfor får du “GPS-pluginnet er ikke tilgængeligt i denne build.”
- **Spotify:** Login bliver hængende på “Forbinder…”, hvilket peger på at native callback-flowet ikke bliver gennemført eller at token-udvekslingen aldrig når tilbage til UI’et.

## Plan

1. **Gør Capacitor-plugins bundlet deterministisk**
   - Erstat de nuværende “skjulte” dynamiske imports af Capacitor-plugins med Vite-venlige dynamiske imports.
   - Det gælder især `@capacitor/geolocation`, `@capacitor/app`, `@capacitor/browser` og `@capacitor/preferences`.
   - Målet er at plugins faktisk kommer med i `dist` og dermed virker i TestFlight-buildet.

2. **GPS: tydelig fallback og start-flow**
   - Opdatér `geolocation-native.ts`, så “plugin ikke fundet” ikke forveksles med “permission nægtet”.
   - Lad løbetrackeren bruge web-geolocation som sidste fallback, hvis Capacitor siger native men plugin-loaderen fejler.
   - Start løb må ikke bare fortsætte stille, hvis der hverken er native plugin eller web-GPS.

3. **Spotify: gør native OAuth robust**
   - Skift native åbning af Spotify til en plugin-metode der findes stabilt i Capacitor (`Browser.open`) i stedet for at være afhængig af en usikker `App.openUrl`-gren.
   - Behold `appUrlOpen` listeneren til `jonas-orbit-run://callback`.
   - Sørg for at fejl fra callback/token exchange vises direkte i UI’et i stedet for bare “Forbinder…” for evigt.

4. **Spotify: automatisk recovery fra hængt login**
   - Når brugeren trykker connect, ryd gammel PKCE-verifier før ny auth starter.
   - Hvis appen kommer tilbage fra Safari/Browser uden token, skal knappen vende tilbage til “Forbind Spotify” og vise en konkret fejlbesked.

5. **Ryd op i iOS-dokumentation**
   - Ret modstridende afsnit i `docs/IOS_SETUP.md`, så den matcher den faktiske beslutning: `CapacitorHttp.enabled = false` for ikke at ødelægge Mapbox.
   - Tilføj en kort “hvis du ser GPS-plugin fejl” sektion med præcis kommando: fuld rebuild/sync af iOS-projektet.

## Tekniske filer

- `src/lib/capacitor-runtime.ts`
- `src/lib/geolocation-native.ts`
- `src/hooks/use-run-tracker.ts`
- `src/components/RunMap.tsx`
- `src/lib/spotify.ts`
- `src/components/MusicIntegrationSection.tsx`
- `docs/IOS_SETUP.md`

## Vigtigt efter implementering

Efter ændringen skal der laves en **helt ny iOS-build**, ikke kun web-preview:

```bash
rm -rf ios
npm install
npm run build
npx cap add ios
node scripts/apply-ios-template.mjs
npx cap sync ios
npx cap open ios
```

Hvis `ios/` ikke genskabes efter plugin-loader ændringen, kan TestFlight stadig køre med et gammelt native plugin-state.