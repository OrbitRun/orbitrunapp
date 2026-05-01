# iOS / Apple Health setup

The web app already contains all the logic needed to read heart rate from
Apple Health. To actually see HR data on a device you must wrap the web
build in a Capacitor iOS shell and build it in Xcode.

## 1. Install Capacitor + HealthKit + BLE plugins

In a local clone of the project (Capacitor cannot run in the Cloudflare
Worker bundle, so these are NOT added to the web `package.json`):

```bash
bun add @capacitor/core @capacitor/ios @capacitor-community/health @capacitor-community/bluetooth-le
bun add -d @capacitor/cli
```

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
   ```
3. Build & run on a real device (HealthKit is unavailable in the simulator).

## 4. Update flow after web changes

Whenever the web app is updated:

```bash
bun run build
npx cap sync ios
```

Then re-archive in Xcode and ship via TestFlight / App Store.

## How the bridge works

`src/lib/health.ts` dynamically imports `@capacitor-community/health` and
checks `Capacitor.isNativePlatform()` + `getPlatform() === "ios"`. On the web
every call is a safe no-op, so nothing breaks when the plugin is absent.
