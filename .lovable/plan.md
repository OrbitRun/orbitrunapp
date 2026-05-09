## Mål

Færdiggør iOS/Capacitor-build af Orbit Run: rigtigt Spotify URL-scheme, ægte BLE pulsbælte, baggrunds-GPS og lås overscroll på iOS.

## Ændringer

### 1. Spotify — nyt scheme `jonas-orbit-run://callback`

`src/lib/spotify.ts`
- `NATIVE_REDIRECT_URI` → `"jonas-orbit-run://callback"`
- `appUrlOpen`-listeneren matcher `event.url.startsWith("jonas-orbit-run://")`

`capacitor.config.ts` + `docs/IOS_SETUP.md`
- Opdater kommentarer + Info.plist `CFBundleURLTypes` snippet til scheme `jonas-orbit-run`
- Note om at registrere `jonas-orbit-run://callback` i Spotify Developer Dashboard

Listeneren i `src/routes/__root.tsx` er allerede mountet via `initSpotifyDeepLinkListener()` — uændret.

### 2. Bluetooth pulsbælte — installér plugin + ny direkte-knap

Pakke
- `bun add @capacitor-community/bluetooth-le` (dynamisk import findes allerede i `src/lib/heart-rate-ble-native.ts`; pakken mangler bare i `package.json`)

`src/lib/heart-rate-bt.ts` (façade)
- Tilføj `connectBleDirect()`-eksport som tvinger `connectNativeBleHeartRate()` (springer transport-picker over) så knappen altid scanner via BLE på iOS i stedet for at falde tilbage til Apple Health.

`src/components/SensorsSection.tsx`
- Tilføj en primær "Forbind pulsmåler"-CTA øverst i sensors-kortet, der kalder `connectBleDirect()`. Knappen vises både når der ingen device er, og når sidste forsøg fejlede. Eksisterende step-modal og Apple Health fallback bevares.

Heart Rate Service (UUID `0000180d-...`) bruges allerede i `heart-rate-ble-native.ts`.

### 3. GPS — baggrunds-tracking via `@capacitor-community/background-geolocation`

Pakke
- `bun add @capacitor-community/background-geolocation`

Ny fil `src/lib/background-geolocation.ts`
- Web-safe wrapper, dynamisk import (samme mønster som `geolocation-native.ts`)
- Eksporter:
  - `isBackgroundGeolocationAvailable()`
  - `startBackgroundWatch(onPos, onError)` → returnerer en `watcherId`
  - `stopBackgroundWatch(id)`
- Konfigurerer `backgroundMessage`, `backgroundTitle`, `requestPermissions: true`, `stale: false`, `distanceFilter: 5`.

`src/hooks/use-run-tracker.ts`
- Brug `startBackgroundWatch` i stedet for `nativeWatchPosition` når pluginnet er tilgængeligt og status er `running`. Falder tilbage til eksisterende `nativeWatchPosition` / `navigator.geolocation` ellers.
- `stop()` / `pause()` rydder watcheren.

`src/hooks/use-wake-lock.ts` er allerede aktiv — uændret.

`docs/IOS_SETUP.md`
- Tilføj `UIBackgroundModes: location` + `NSLocationAlwaysAndWhenInUseUsageDescription` instruks samt note om at acceptere "Always" på iOS-prompten.

### 4. UI Lock — ingen rubber-banding/overscroll

`src/styles.css`
- Tilføj global regel:
  ```css
  html, body { overscroll-behavior: none; overflow-x: hidden; }
  body { position: fixed; inset: 0; overflow: hidden; }
  #root, .app-scroll { height: 100%; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; }
  ```
  (Tilpasses så det ikke knækker eksisterende fixed `BottomNav` — vi pakker root-`<Outlet/>` containeren med en scroll-wrapper i `__root.tsx`.)

`src/routes/__root.tsx`
- Wrap eksisterende `<div className="min-h-screen pb-24 ...">` i en `app-scroll`-container så scroll sker indenfor — ikke på `body`.

`capacitor.config.ts`
- Sæt `ios.scrollEnabled: false` for at deaktivere WKWebView's bounce på selve roden (intern scroll fungerer stadig).

## Filer der ændres
- `package.json` (3 nye deps)
- `src/lib/spotify.ts`
- `src/lib/heart-rate-bt.ts`
- `src/components/SensorsSection.tsx`
- `src/hooks/use-run-tracker.ts`
- `src/lib/background-geolocation.ts` (ny)
- `src/styles.css`
- `src/routes/__root.tsx`
- `capacitor.config.ts`
- `docs/IOS_SETUP.md`

## Brugerens manuelle steps efter bygning
1. Spotify Dashboard → tilføj redirect URI `jonas-orbit-run://callback`
2. Xcode → `Info.plist`:
   - `CFBundleURLTypes` med scheme `jonas-orbit-run`
   - `NSBluetoothAlwaysUsageDescription`
   - `NSLocationAlwaysAndWhenInUseUsageDescription`
   - `UIBackgroundModes` → `location`, `bluetooth-central`
3. `bun install && bun run build:ios && npx cap sync ios`
