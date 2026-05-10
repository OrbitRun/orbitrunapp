## Plan

1. **Gør Capacitor-konfigurationen mere komplet**
   - Behold `webDir: "dist"`.
   - Behold URL scheme `jonas-orbit-run`.
   - Tilføj/ret iOS-konfigurationen så native iOS-shellen får korrekt scheme-registrering og webview-adfærd, hvor Capacitor understøtter det.

2. **Gør Spotify OAuth-flowet mere robust på iOS**
   - Sikr at native redirect altid bruger præcis `jonas-orbit-run://callback`.
   - Forbedr håndtering af deep links fra iOS, så både `code`, `error`, path og query bliver behandlet korrekt.
   - Gør fejlbeskeder tydeligere, især ved Spotify `redirect_uri_mismatch` / token exchange-fejl.
   - Sørg for at browseren lukkes efter callback, og at appen sender en intern success/error event.

3. **Gør GPS-tilladelser tydelige og Xcode-klare**
   - Opdater iOS setup-dokumentationen med en konkret `Info.plist`-blok, der indeholder:
     - `NSLocationWhenInUseUsageDescription`
     - `NSLocationAlwaysAndWhenInUseUsageDescription`
     - `NSLocationAlwaysUsageDescription`
     - `UIBackgroundModes` med `location` og `audio`
     - `CFBundleURLTypes` med `jonas-orbit-run`
   - Tilføj en Xcode checklist: Signing & Capabilities → Background Modes → Location updates + Audio.

4. **Tilføj native iOS konfigurationsskabelon i repoet**
   - Da `ios/` ikke findes i projektet endnu, tilføjes en kopiér-klar plist-snippet i dokumentationen, så du kan indsætte den direkte efter `npx cap add ios`.
   - Hvis du senere tilføjer `ios/` til repoet, kan vi rette den faktiske `ios/App/App/Info.plist` direkte.

5. **Verificér build-output og kommandoer**
   - Behold `npm run build` → `dist/index.html`.
   - Behold `npx cap sync ios` som korrekt lowercase-kommando.
   - Opdater dokumentationen, så rækkefølgen er entydig: `npm install`, `npm run build`, `npx cap add ios` første gang, `npx cap sync ios`, `npx cap open ios`.

## Vigtigt for Spotify
Spotify Developer Dashboard skal have Redirect URI præcis som denne, ellers får du redirect-fejl:

```text
jonas-orbit-run://callback
```

Den må ikke være `capacitor://localhost`, `jonas-orbit-run:/callback`, have trailing slash eller bruge et andet scheme.