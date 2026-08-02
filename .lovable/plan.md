# Native-first GPS in geolocation-native.ts

Make the geolocation layer trust Capacitor's own platform API and always use the native plugin on iOS/Android. The browser API becomes a web-only path.

## Changes (single file: `src/lib/geolocation-native.ts`)

1. **Platform detection**
   - Import `Capacitor` from `@capacitor/core` and `Geolocation` from `@capacitor/geolocation` directly (static imports, no lazy `import()` wrapper, no `window.Capacitor` probing).
   - `getPlatform()` returns `Capacitor.getPlatform()`.
   - `isNativeGeolocationAvailable()` returns `Capacitor.isNativePlatform()` for ios/android.

2. **Permissions**
   - Native: `Geolocation.checkPermissions()` then `Geolocation.requestPermissions()`; return the mapped status. No `navigator.geolocation` fallback on native.
   - Web: keep the existing `navigator.geolocation` probe.

3. **Position reads**
   - `nativeGetCurrentPosition()`: on ios/android call `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 })`; only the web branch uses `navigator.geolocation`.
   - `nativeWatchPosition()`: on ios/android call `Geolocation.watchPosition(...)` and return a `cap:<id>` handle; web returns `web:<id>`.
   - `nativeClearWatch()` keeps handling both prefixes.

4. **Kept as-is**
   - `withTimeout` guards remain so a hung bridge surfaces as an error instead of freezing, but the error is reported rather than silently falling back to `navigator` on native.
   - `toBrowserPosition()` and the `NativePosition` shape stay unchanged, so `use-run-tracker.ts` and all run/pace/distance calculations are untouched.

## Not changed

No edits to run calculation logic, the tracker hook, map component, or any other file.
