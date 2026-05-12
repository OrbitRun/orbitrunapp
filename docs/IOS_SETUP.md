# iOS / Capacitor setup — strømlinet opskrift

Denne opskrift får Orbit Run igennem Xcode → TestFlight uden SPM-fejl på
`CapApp-SPM`. `ios/`-mappen er bevidst i `.gitignore` — den genskabes hver
gang.

> Capacitor er ikke i web-bundlen. Plugins installeres via `package.json` på
> din Mac som vanligt.

---

## 1. Plugins (allerede i package.json)

Alle på Capacitor 8.x — én major, ingen blandede versioner:

- `@capacitor/core` 8.3.3
- `@capacitor/ios` 8.3.3
- `@capacitor/cli` 8.3.3 (devDep)
- `@capacitor/app` 8.1.0
- `@capacitor/browser` 8.0.3
- `@capacitor/geolocation` 8.2.0
- `@capacitor/local-notifications` 8.1.0
- `@capacitor-community/bluetooth-le` 8.1.3
- `@capacitor/preferences` 8.x  (native key/value storage for Spotify token + PKCE verifier — survives Safari → app handoff)

`CapacitorHttp` (bundled i `@capacitor/core`) er aktiveret i `capacitor.config.ts`
under `plugins.CapacitorHttp.enabled = true`. Det rerouter `fetch()` /
`XMLHttpRequest` gennem iOS' native HTTP-stack og fjerner `DownloadFailed` /
sandbox-extension fejl som Spotify og Open-Meteo udløste i WKWebView.

Bemærk: `@capacitor-community/background-geolocation` er **fjernet**.
Baggrunds-GPS leveres af `@capacitor/geolocation` + `UIBackgroundModes=location`
+ "Always"-permission. Færre plugins = ingen SPM-konflikt.

---

## 2. Eksport-flow (kør på din Mac)

```bash
rm -rf node_modules package-lock.json ios
npm install
npm run build
npx cap add ios
node scripts/apply-ios-template.mjs   # injicerer Info.plist (Spotify, GPS, Health, BLE, Motion)
npx cap sync ios
npx cap open ios
```

`rm -rf` af lockfile + `ios/` er obligatorisk efter plugin-ændringer —
det er hovedårsagen til `CapApp-SPM` SPM-fejl i Xcode.

---

## 3. Info.plist — automatiseret

`templates/Info.plist` indeholder ALLE nødvendige keys:
- `CFBundleURLTypes` med `jonas-orbit-run` (Spotify callback)
- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription`
- `NSLocationAlwaysUsageDescription`
- `UIBackgroundModes` = `["location", "audio"]`
- `NSHealthShareUsageDescription`, `NSHealthUpdateUsageDescription`
- `NSMotionUsageDescription`
- `NSBluetoothAlwaysUsageDescription`

`scripts/apply-ios-template.mjs` kopierer den ind i `ios/App/App/Info.plist`
efter `npx cap add ios`. Du behøver ikke åbne plist'en manuelt.

---

## 4. Xcode — Signing & Capabilities

Åbn `ios/App/App.xcworkspace` (eller via `npx cap open ios`) → **App**-target
→ **Signing & Capabilities**:

1. Vælg dit **Team** under Signing.
2. **+ Capability → HealthKit**
3. **+ Capability → Background Modes**, sæt flueben i:
   - **Location updates**
   - **Audio, AirPlay, and Picture in Picture**

HealthKit, BLE og baggrunds-GPS virker ikke i simulatoren — brug en fysisk
enhed.

---

## 5. Spotify Redirect URI

I [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) →
din app → **Edit Settings** → **Redirect URIs** tilføj **præcis**:

```
jonas-orbit-run://callback
```

Behold også din web-URI (`https://orbitrunapp.lovable.app/spotify/callback`)
så web-buildet stadig virker. Almindelige fejl:

- ❌ `capacitor://localhost` — Spotify accepterer ikke den slags.
- ❌ `jonas-orbit-run://callback/` (trailing slash).
- ❌ `jonas-orbit-run:/callback` (kun ét skråstreg).

---

## 6. Opdateringsflow når web-appen ændres

Plugin-listen er uændret:
```bash
npm run build
npx cap sync ios
```

Plugin-listen ændret (eller SPM-fejl):
```bash
rm -rf ios
npm install
npm run build
npx cap add ios
node scripts/apply-ios-template.mjs
npx cap sync ios
```

---

## 7. Tjekliste når noget ikke virker

- **`CapApp-SPM` kan ikke løses i Xcode** → `rm -rf node_modules
  package-lock.json ios` og start forfra fra §2. SPM cacher tidligere
  plugin-versioner.
- **GPS-prompt vises ikke** → tjek at `node scripts/apply-ios-template.mjs`
  kørte uden fejl. Slet appen fra enheden og installer igen (iOS cacher
  "Don't Allow"-svar).
- **GPS dør når skærmen låses** → Background Modes → Location updates skal
  være tændt i Xcode (§4) **og** brugeren skal have valgt "Always".
- **Spotify-login fejler ved retur** → Redirect URI matcher ikke
  `jonas-orbit-run://callback`. Sammenlign tegn-for-tegn.
- **Spotify åbner Safari i stedet for in-app browser** → `@capacitor/browser`
  ikke installeret. Kør `npm install` igen.

---

## 8. Spotify OAuth — sidder fast på "Connecting Spotify…"

Hvis Safari kommer tilbage til appen, men UI'et bliver hængende på
"Connecting Spotify…", er årsagen næsten altid Spotify-dashboardet:

- Åbn [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
  → din app → **Edit Settings** → **Redirect URIs**.
- **`jonas-orbit-run://callback` SKAL stå der præcis sådan** (ingen trailing
  slash, ingen ekstra mellemrum). Web-URI'en alene er ikke nok til iOS-
  buildet — uden den native URI redirect'er Spotify ind i SFSafariViewController
  i stedet for at sende deep-link tilbage til appen.
- Vent ~30 sekunder efter du har gemt — Spotify cacher redirect-listen.
- Slet appen fra enheden og installer igen efter ændringer i `Info.plist`
  (iOS cacher URL-scheme registreringer).

Tjek Xcode-konsollen mens du forsøger login. Du skal se:
```
[spotify] beginAuth { native: true, redirect_uri: "jonas-orbit-run://callback" }
[spotify] deep link received jonas-orbit-run://callback?code=...
[spotify] token exchange OK
```

Hvis `native: false` står der, har Capacitor ikke initialiseret korrekt —
genstart appen helt (luk via app-switcheren).

---

## 9. Strict HTTPS + native HTTP for alle eksterne kald

Alle udgående kald i appen er nu låst til **HTTPS** og rutes gennem Capacitor
HTTP på iOS:

- `src/lib/native-http.ts` opgraderer enhver `http://` til `https://` før
  request afsendes (både `nativeRequest` og `nativeFetchDataUrl`).
- `CapacitorHttp.enabled = true` i `capacitor.config.ts` patcher
  `window.fetch` + `XMLHttpRequest`, så også **mapbox-gl** tile/style requests
  går gennem den native HTTP-stack — ingen flere `DownloadFailed` /
  `unable to make sandbox extension` resets på Mapbox.
- `MAPBOX_STYLE` er nu en eksplicit `https://api.mapbox.com/styles/v1/...`
  URL i stedet for `mapbox://styles/...`, så WKWebView aldrig skal slå et
  custom-scheme op internt.
- Mapbox **static images** (share-card) hentes via `nativeFetchDataUrl()` →
  data URL → `<img>.src`, så billedet ikke åbner et separat `<img>`-load uden
  for native HTTP-broen.
- Spotify token (`pulse.spotify.token`) og PKCE verifier (`pulse.spotify.verifier`)
  ligger udelukkende i `@capacitor/preferences` på native (ingen
  localStorage-mirror) — undgår at sandbox-extension drops vipper login state.

### Når du har trukket disse ændringer

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios
```

(SPM-cachen behøver kun nukes hvis Xcode klager på `CapApp-SPM` — se §6.)

I Xcode-konsollen skal du nu se linjer som:
```
[native-http] → GET https://api.spotify.com/v1/me/player
[native-http] → POST https://accounts.spotify.com/api/token
[native-http] (blob) → https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/...
```
Hvis du i stedet ser `[native-http] CapacitorHttp unavailable on native`, så
kørte `npx cap sync ios` ikke efter `capacitor.config.ts` blev opdateret.
