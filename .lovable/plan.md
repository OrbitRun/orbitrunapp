## Goal

Make the iGPSPORT HR50 (and any standard BLE Heart Rate strap) actually pair with Orbit. Today the Sensors row shows **"Not supported"** on iOS Safari/PWA because the app only uses **Web Bluetooth**, which Apple does not implement in any iOS browser. We will add a native BLE path and an Apple Health fallback, and choose between them automatically.

## Why "Not supported" appears

`src/lib/heart-rate-bt.ts` initializes status to `"unsupported"` when `navigator.bluetooth` is missing. On iOS, `navigator.bluetooth` is **always** missing — Safari, Chrome-for-iOS, and PWAs all use WebKit, which has no Web Bluetooth. So on iPhone the row is permanently dead. Web Bluetooth works only in:
- Chrome / Edge / Opera on Android, macOS, Windows, Linux
- A native shell (Capacitor) that bridges to the OS BLE stack

The fix is therefore not a JS-only change — we need a native bridge for iOS. The good news: the project is already wired for Capacitor (`capacitor.config.ts`, `docs/IOS_SETUP.md`, the dynamic Apple Health bridge in `src/lib/health.ts`). We follow the same pattern for BLE.

## Solution overview

Three layers, picked automatically in this order at runtime:

```text
                 ┌──────────────────────────────────────┐
                 │  HR source (live BPM stream)         │
                 └──────────────────────────────────────┘
                                  ▲
   1. Native BLE   ───────────────┤  iOS app (Capacitor) + Android Chrome
      (preferred)                 │
                                  │
   2. Web Bluetooth ──────────────┤  Desktop / Android Chromium browsers
                                  │
                                  │
   3. Apple Health fallback ──────┘  iOS app, when BLE pairing fails
                                     (strap is paired to iPhone via iOS Settings
                                      → readings flow through HealthKit)
```

## Changes

### 1. New native BLE adapter — `src/lib/heart-rate-ble-native.ts`
Thin wrapper around the **`@capacitor-community/bluetooth-le`** plugin (the de-facto BLE plugin for Capacitor; supports both iOS and Android, exposes the standard GATT model we already use). Mirrors the API of the existing `heart-rate-bt.ts`:

- `isNativeBleAvailable()` — true only when `Capacitor.isNativePlatform()` and the plugin loads.
- `connectNativeBleHeartRate()` — initialize, request the `Heart Rate` service (UUID `0000180d-...`), open a chooser, connect, subscribe to `Heart Rate Measurement` (UUID `00002a37-...`), parse BPM with the same flag/byte logic already in `parseHeartRate`, optionally read Battery Level (`0x180F` / `0x2A19`).
- `disconnectNativeBleHeartRate()`, `tryReconnectLastNativeDevice()`, `subscribeNativeBle()`, `getNativeBleState()` with the same `BtHrState` shape as today, so consumers don't care which transport is active.
- Dynamic `import()` hidden from Vite (same `Function("s","return import(s)")` trick used in `health.ts`) so the web build keeps working without the plugin installed.

### 2. Unified façade — refactor `src/lib/heart-rate-bt.ts`
Promote it from "Web Bluetooth client" to a transport selector:

- New internal `pickTransport()` returns `"native"` if `isNativeBleAvailable()`, else `"web"` if `isWebBluetoothSupported()`, else `"none"`.
- `isHeartRateSensorSupported()` returns true when **either** transport exists, OR when Apple Health is available (the fallback). This is what `SensorsSection` should check instead of `isWebBluetoothSupported()` — that's why iOS users see "Not supported" today.
- `connectBtHeartRate()` delegates to the chosen transport. Existing Web Bluetooth code stays as the `"web"` branch, untouched.
- `subscribeBtHr` keeps emitting one merged state object so the UI does not change shape.

### 3. Apple Health fallback path — extend `src/lib/health.ts` + façade
- Reuse the existing `requestHeartRatePermission()` and `startHeartRatePolling()` (already implemented; polls `HKQuantityTypeIdentifierHeartRate` every 5s).
- Add a new transport `"health"` to the façade. If native BLE pairing fails (user cancels chooser, plugin error, strap not advertising), surface a CTA: **"Use Apple Health instead"**. Tapping it calls `requestHeartRatePermission()`, then starts polling and pushes BPM updates into the same `state.bpm` slot via `setState({ bpm })`. Status becomes `"connected"` with `deviceName: "Apple Health"`.
- On disconnect, call `stopHeartRatePolling()`.

The HR50 supports the standard BLE HR profile **and** broadcasts to Apple Health when paired in iOS Settings, so this fallback is real and useful.

### 4. UI — `src/components/SensorsSection.tsx`
- Replace `isWebBluetoothSupported()` check with `isHeartRateSensorSupported()` from the façade.
- Replace the static **"Not supported"** label with a smarter status:
  - On iOS web (no native shell, no Web Bluetooth): show **"Open in Orbit app to pair"** and, if Apple Health is available, an inline **"Use Apple Health"** button.
  - On Android Chrome / desktop: existing Web Bluetooth flow, unchanged.
  - In Capacitor iOS shell: the new native flow is used; the modal copy is unchanged.
- Pairing modal Step 3 gains a small secondary action: **"Kan ikke finde dit bælte? Brug Apple Health"** when `isHealthAvailable()` is true and BLE failed. Hidden otherwise.
- Connected card shows source: `Bluetooth · iGPSPORT HR50` vs `Apple Health · iPhone`.

### 5. Capacitor wiring — `docs/IOS_SETUP.md` update
Add a step:
```bash
bun add @capacitor-community/bluetooth-le
npx cap sync ios
```
And in Xcode, add to `ios/App/App/Info.plist`:
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Orbit connects to your heart rate strap to show live BPM during runs.</string>
```
This is required by Apple — without it iOS kills the app on first BLE call. No package.json change for the web (the plugin is loaded dynamically, identical to the Apple Health plugin pattern).

### 6. Run tracker integration
`src/hooks/use-run-tracker.ts` already prefers `getLatestBtBpm()` from `heart-rate-bt.ts`. Because the façade keeps the same exports and updates the same state, the tracker keeps working with no changes for both the native and the Health fallback paths.

## Out of scope

- Android native shell / Play Store. The plugin supports it, but no Android wrapper exists in the project today.
- Background BLE in iOS lock-screen mode (requires a separate background mode and is not needed for the scan/connect flow).
- Multi-sensor support (cadence pod, footpod) — only the HR profile is added now.

## Files touched

- **new** `src/lib/heart-rate-ble-native.ts`
- **edit** `src/lib/heart-rate-bt.ts` — transport selector + Health fallback wiring
- **edit** `src/lib/health.ts` — small helper to expose a "stream" subscription compatible with the façade
- **edit** `src/components/SensorsSection.tsx` — support check, fallback CTA, source label
- **edit** `docs/IOS_SETUP.md` — BLE plugin install + Info.plist key

## Validation

1. **Desktop Chrome**: Web Bluetooth path still pairs with the HR50 via the browser chooser (regression check).
2. **iOS Safari (no Capacitor)**: Sensors row no longer says "Not supported"; shows "Open in Orbit app" and, if a previous Health permission exists, the "Use Apple Health" button streams BPM.
3. **iOS Capacitor build**: After `npx cap sync ios` and granting Bluetooth permission, the chooser lists the HR50 and live BPM appears within ~5 s; battery % shows when available.
4. **Fallback**: Disable BLE on the strap (or cancel the chooser), tap "Brug Apple Health" → permission prompt → BPM updates every 5 s from HealthKit.
