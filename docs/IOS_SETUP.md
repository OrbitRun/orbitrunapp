# iOS / Apple Health setup

The web app already contains all the logic needed to read heart rate from
Apple Health. To actually see HR data on a device you must wrap the web
build in a Capacitor iOS shell and build it in Xcode.

## 1. Install Capacitor + HealthKit + BLE plugins

In a local clone of the project (Capacitor cannot run in the Cloudflare
Worker bundle, so these are NOT added to the web `package.json`):

```bash
npm install @capacitor/core @capacitor/ios @capacitor/geolocation \
  @capacitor/app @capacitor/browser \
  @capacitor-community/health @capacitor-community/bluetooth-le \
  @capacitor-community/background-geolocation
npm install -D @capacitor/cli
```

> `@capacitor/app` + `@capacitor/browser` are required for the Spotify
> OAuth flow on iOS — the auth page opens in an in-app browser and the
> redirect comes back via the `jonas-orbit-run://callback` URL scheme
> (see section 5 below).

> `@capacitor-community/background-geolocation` keeps GPS fixes streaming
> while the screen is locked / app backgrounded. Requires
> `UIBackgroundModes=location` + the user accepting the "Always" prompt.

> `@capacitor/geolocation` enables true high-accuracy background GPS on iOS
> (`kCLLocationAccuracyBestForNavigation`) and Android (`PRIORITY_HIGH_ACCURACY`).
> The web app automatically falls back to `navigator.geolocation` in the
> browser — see `src/lib/geolocation-native.ts`.

> The Bluetooth LE plugin powers direct pairing with standard BLE heart-rate
> straps (e.g. iGPSPORT HR50, Polar H10, Garmin HRM-Pro). On iOS Safari the
> web app falls back to Apple Health for HR data — both paths are handled
> automatically by `src/lib/heart-rate-bt.ts`.

## 2. Add the iOS platform

```bash
npm run build              # produces dist/index.html (matches webDir)
npx cap add ios
npx cap sync ios
```

## 3. Enable HealthKit in Xcode

```bash
npx cap open ios
```

In Xcode:

1. Select the **App** target → **Signing & Capabilities** → **+ Capability**
   → **HealthKit**.
2. Open `ios/App/App/Info.plist` and add:
   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>Orbit Run bruger dine sundhedsdata (puls, søvn og HRV) til at lade Orbit Coach beregne din daglige form og optimere din træning.</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Orbit Run gemmer dine løbeture i Apple Health.</string>
   <key>NSMotionUsageDescription</key>
   <string>Orbit Run bruger bevægelsessensorer til at forbedre nøjagtigheden af skridt og kadence.</string>
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>Orbit Run forbinder til dit pulsbælte for at vise live BPM under løb.</string>
   ```
   `NSBluetoothAlwaysUsageDescription` is required by Apple — without it iOS
   terminates the app the first time it tries to scan for a BLE sensor.
3. **Add Background GPS** — still in `Info.plist`, add:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Orbit Run bruger GPS til at måle din distance og rute præcist under løb.</string>
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Orbit Run fortsætter med at tracke din løbetur når skærmen er låst eller du skifter app, så ruten forbliver præcis.</string>
   <key>UIBackgroundModes</key>
   <array>
     <string>location</string>
     <string>audio</string>
   </array>
   ```
   - `location` background mode is what allows
     `kCLLocationAccuracyBestForNavigation` to keep streaming when the screen
     is locked. Without it iOS suspends the app within seconds.
   - `audio` is already used by the silent-loop trick in `audio-cues.ts` to
     keep voice cues firing — keep it alongside `location`.
   - In **Signing & Capabilities** also add the **Background Modes**
     capability and tick **Location updates** + **Audio, AirPlay, and
     Picture in Picture**. The plist keys above are equivalent but Xcode
     will mirror them into the entitlements when ticked.
4. Build & run on a real device (HealthKit, BLE and background GPS are all
   unavailable in the simulator).

## 5. Spotify OAuth — custom URL scheme

Inside the iOS shell the web origin (`capacitor://localhost`) is not a valid
Spotify Redirect URI, and using a generic scheme like `capacitor://` can
collide with other Capacitor apps installed on the device (e.g. Bookli). The
app uses a unique custom URL scheme: `jonas-orbit-run://callback`.

**a) Register the scheme in `ios/App/App/Info.plist`:**
```xml
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
```

**b) Add the same Redirect URI in the Spotify Developer Dashboard**
(`https://developer.spotify.com/dashboard` → your app → Edit Settings →
Redirect URIs):
```
jonas-orbit-run://callback
```
Keep your existing web URI (`https://orbitrunapp.lovable.app/spotify/callback`)
alongside it so the web build still works.

The app handles the callback automatically: `beginAuth()` opens Spotify in an
in-app browser via `@capacitor/browser`, and `initSpotifyDeepLinkListener()`
(mounted in `__root.tsx`) listens for `appUrlOpen`, exchanges the code, and
closes the browser.

## 6. Update flow after web changes

Whenever the web app is updated:

```bash
npm run build
npx cap sync ios
```

Then re-archive in Xcode and ship via TestFlight / App Store.

## How the bridges work

- `src/lib/health.ts` dynamically imports `@capacitor-community/health` and
  checks `Capacitor.isNativePlatform()` + `getPlatform() === "ios"`. On the web
  every call is a safe no-op, so nothing breaks when the plugin is absent.
- `src/lib/geolocation-native.ts` does the same for `@capacitor/geolocation`.
  On native it requests location permission, runs `getCurrentPosition` for an
  immediate fix and `watchPosition` with `enableHighAccuracy: true` (which
  iOS maps to `kCLLocationAccuracyBestForNavigation` and Android to
  `PRIORITY_HIGH_ACCURACY`). The run tracker (`use-run-tracker.ts`)
  automatically prefers the native bridge when running inside Capacitor and
  falls back to `navigator.geolocation` in the browser.

### Why background tracking works

On iOS, `kCLLocationAccuracyBestForNavigation` only continues to deliver
fixes while the app is backgrounded if **both** of these are true:

1. The user has granted **"Always"** location permission (the system shows
   the upgrade prompt the second time the app starts in the background).
2. The app declares the `location` value in `UIBackgroundModes`.

Both are configured by the Info.plist snippet above. The first time a run
starts, iOS will ask for "When In Use"; after the run ends iOS will (within
a few minutes) prompt the user to allow "Always" so future runs keep
tracking when the screen is locked.


## Final export checklist

Run locally (Cloudflare Worker can't host the iOS shell):

```bash
npm install
npm run build         # produces dist/index.html (matches webDir)
npx cap add ios       # first time only
npx cap sync ios      # every time the web app changes
npx cap open ios      # Archive → TestFlight
```

After `cap sync`, double-check `ios/App/App/Info.plist` contains every
purpose string listed above — Capacitor merges keys but won't add ones it
doesn't know about.
