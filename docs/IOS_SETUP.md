# iOS / Apple Health setup

The web app already contains all the logic needed to read heart rate from
Apple Health. To actually see HR data on a device you must wrap the web
build in a Capacitor iOS shell and build it in Xcode.

## 1. Install Capacitor + HealthKit + BLE plugins

In a local clone of the project (Capacitor cannot run in the Cloudflare
Worker bundle, so these are NOT added to the web `package.json`):

```bash
bun add @capacitor/core @capacitor/ios @capacitor/geolocation \
  @capacitor-community/health @capacitor-community/bluetooth-le
bun add -d @capacitor/cli
```

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
bun run build              # produces dist/client (matches webDir)
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
   <string>Orbit reads your heart rate during runs to show live BPM and save it alongside your route.</string>
   <key>NSBluetoothAlwaysUsageDescription</key>
   <string>Orbit connects to your heart rate strap to show live BPM during runs.</string>
   ```
   `NSBluetoothAlwaysUsageDescription` is required by Apple — without it iOS
   terminates the app the first time it tries to scan for a BLE sensor.
3. **Add Background GPS** — still in `Info.plist`, add:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Orbit uses your location to track your run route, distance and pace.</string>
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Orbit keeps tracking your run when the screen is locked or you switch apps, so your route stays accurate.</string>
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

## 4. Update flow after web changes

Whenever the web app is updated:

```bash
bun run build
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

