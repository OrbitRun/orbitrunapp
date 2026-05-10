# iOS / Capacitor setup — GPS, Apple Health, BLE og Spotify

Denne guide er den fulde opskrift til at få Orbit Run til at køre i Xcode med
korrekte tilladelser til GPS (også i baggrunden) og Spotify-login uden
redirect-fejl.

> Capacitor og dets plugins er ikke i `package.json` (de kan ikke køre i web-/
> Cloudflare-bundlen). Installer dem lokalt før `npx cap`-kommandoer.

---

## 1. Installer Capacitor + plugins (lokalt)

```bash
npm install @capacitor/core @capacitor/ios @capacitor/geolocation \
  @capacitor/app @capacitor/browser \
  @capacitor-community/health @capacitor-community/bluetooth-le \
  @capacitor-community/background-geolocation
npm install -D @capacitor/cli
```

## 2. Byg web-appen og tilføj iOS-platformen

```bash
npm install
npm run build              # genererer dist/index.html (matcher webDir i capacitor.config.ts)
npx cap add ios            # kun første gang
npx cap sync ios           # hver gang web-appen ændres
npx cap open ios           # åbner Xcode
```

`webDir` i `capacitor.config.ts` peger på `dist`, og det custom URL scheme
`jonas-orbit-run` er allerede registreret dér.

---

## 3. Info.plist — KOPIÉR-KLAR BLOK

Åbn `ios/App/App/Info.plist` i Xcode (Right-click → Open As → Source Code) og
sørg for at følgende keys findes inde i den øverste `<dict>`. Hvis nogle
allerede står der, så lad være med at duplikere — opdater i stedet værdierne.

```xml
<!-- Spotify OAuth callback (jonas-orbit-run://callback) -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.orbitrun.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>jonas-orbit-run</string>
    </array>
  </dict>
</array>

<!-- GPS — både forgrund og baggrund -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Orbit Run bruger GPS til at måle din distance og rute præcist under løb.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Orbit Run fortsætter med at tracke din løbetur når skærmen er låst eller du skifter app, så ruten forbliver præcis.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>Orbit Run fortsætter med at tracke din løbetur når skærmen er låst.</string>

<!-- Baggrundskørsel for GPS + lyd-cues -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>audio</string>
</array>

<!-- Apple Health -->
<key>NSHealthShareUsageDescription</key>
<string>Orbit Run bruger dine sundhedsdata (puls, søvn og HRV) til at lade Orbit Coach beregne din daglige form og optimere din træning.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Orbit Run gemmer dine løbeture i Apple Health.</string>

<!-- Bevægelsessensorer (skridt/kadence) -->
<key>NSMotionUsageDescription</key>
<string>Orbit Run bruger bevægelsessensorer til at forbedre nøjagtigheden af skridt og kadence.</string>

<!-- Bluetooth (pulsbælte) -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Orbit Run forbinder til dit pulsbælte for at vise live BPM under løb.</string>
```

> Uden `NSLocationWhenInUseUsageDescription` crasher iOS appen første gang
> GPS startes. Uden `UIBackgroundModes=location` stopper GPS efter få
> sekunder, så snart skærmen låses.

---

## 4. Xcode — Signing & Capabilities

I Xcode (`npx cap open ios`) → vælg **App**-target → **Signing & Capabilities**:

1. **+ Capability → HealthKit**
2. **+ Capability → Background Modes**, og sæt flueben i:
   - **Location updates**
   - **Audio, AirPlay, and Picture in Picture**
3. Vælg dit **Team** under Signing, så appen kan signeres til en fysisk enhed.
   (HealthKit, BLE og baggrunds-GPS virker ikke i simulatoren.)

Plist-keys og Background Modes-flueboksene er to sider af samme sag — Xcode
spejler dem i entitlements-filen.

---

## 5. Spotify OAuth — undgå redirect-fejl

Inde i Capacitor-shellen er web-origin `capacitor://localhost`, som Spotify
**ikke** accepterer som Redirect URI. Appen bruger derfor et unikt custom
scheme: **`jonas-orbit-run://callback`**.

### a) Registrer scheme i Info.plist
Allerede dækket af `CFBundleURLTypes`-blokken i §3.

### b) Tilføj Redirect URI i Spotify Developer Dashboard
Gå til <https://developer.spotify.com/dashboard> → din app →
**Edit Settings** → **Redirect URIs** og tilføj **præcis** denne streng:

```
jonas-orbit-run://callback
```

Behold også din eksisterende web-URI
(`https://orbitrunapp.lovable.app/spotify/callback`) så web-buildet stadig
virker. Almindelige fejl:

- ❌ `capacitor://localhost` — Spotify accepterer ikke den slags URI'er.
- ❌ `jonas-orbit-run:/callback` (kun ét skråstreg).
- ❌ `jonas-orbit-run://callback/` (trailing slash).
- ❌ Forkert capitalization i `client_id` eller scheme.

Hvis du får `INVALID_CLIENT: Invalid redirect URI`, er det fordi strengen i
Spotify-dashboardet ikke matcher én-til-én med `jonas-orbit-run://callback`.

### c) Sådan virker callback'et
- `beginAuth()` åbner Spotify i in-app browser via `@capacitor/browser`.
- Spotify redirecter til `jonas-orbit-run://callback?code=...`.
- iOS sender URL'en ind i appen via `appUrlOpen`-eventen.
- `initSpotifyDeepLinkListener()` (mountet i `__root.tsx`) fanger eventen,
  bytter `code` til et access token og lukker browseren.

Hvis token-byttet fejler (fx Spotify svarer `redirect_uri_mismatch`), viser
appen den præcise fejltekst inkl. den Redirect URI den brugte — så er det let
at se om det er Spotify-dashboardet, der mangler en post.

---

## 6. Sådan virker GPS-baggrundstracking

På iOS leverer `kCLLocationAccuracyBestForNavigation` kun fixes i baggrunden
hvis **begge** disse er sande:

1. Brugeren har givet **"Always"**-lokationstilladelse. iOS spørger først om
   "When In Use" og opgraderer til "Always" et par minutter efter første løb.
2. Appen har `location` i `UIBackgroundModes` (se §3) **og** Background
   Modes → Location updates aktiveret i Xcode (se §4).

Bridges:
- `src/lib/geolocation-native.ts` — high-accuracy fixes mens appen er aktiv.
- `src/lib/background-geolocation.ts` — baggrundsfixes via
  `@capacitor-community/background-geolocation`.

Begge falder automatisk tilbage til `navigator.geolocation` i web-buildet.

---

## 7. Opdateringsflow når web-appen ændres

```bash
npm run build
npx cap sync ios
```

Derefter re-archive i Xcode og send til TestFlight / App Store.

---

## 8. Tjekliste når noget ikke virker

- **GPS-prompt vises ikke** → tjek at alle tre `NSLocation…`-keys står i
  Info.plist, og at du har slettet appen fra enheden og installeret igen
  (iOS cacher tidligere "Don't Allow"-svar).
- **GPS dør når skærmen låses** → `UIBackgroundModes` mangler `location`,
  eller brugeren har ikke givet "Always".
- **Spotify-login åbner men fejler ved retur** → Redirect URI i Spotify
  Dashboard matcher ikke `jonas-orbit-run://callback`. Sammenlign tegn-for-tegn.
- **Spotify-knap åbner Safari i stedet for in-app browser** →
  `@capacitor/browser` er ikke installeret. Kør `npm install @capacitor/browser`
  efterfulgt af `npx cap sync ios`.
- **`npx cap sync ios` siger "ios platform not found"** → kør
  `npx cap add ios` først.
