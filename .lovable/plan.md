# Native iOS background GPS (isolated change)

Add a small native location plugin so tracking keeps running when the screen is locked or the app is backgrounded, and points recorded while in background are replayed into the run when the app resumes. Nothing else in the app is touched.

## Scope

Only these files change:

1. `templates/ios/OrbitGeo.swift` (new)
2. `src/lib/orbit-geo.ts` (new)
3. `src/hooks/use-run-tracker.ts` (native watch path only)
4. `scripts/apply-ios-template.mjs` (copy + Xcode target registration)
5. `templates/Info.plist` (verify keys — see note below)

Explicitly untouched: `Onboarding.tsx`, `BottomNav.tsx`, keyboard/resize config, visualViewport logic, global overflow / pointer-events / body-lock CSS, dialogs, sheets, inputs, app-shell layout, and all run calculation logic.

## 1. `templates/ios/OrbitGeo.swift`

A Capacitor plugin named `OrbitGeo` wrapping `CLLocationManager`:

- `desiredAccuracy = kCLLocationAccuracyBestForNavigation`, `activityType = .fitness`, `distanceFilter = 5`
- `allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false`
- Methods: `requestPermissions()`, `start()`, `stop()`, `flush()`
- Event `orbitGeoPosition` for each fix while the webview is alive
- Buffer: when the app is not active (`UIApplication.shared.applicationState != .active`), fixes are appended to an in-memory array instead of being emitted. On `didBecomeActive` (or on `flush()`), the buffer is emitted as one `orbitGeoBatch` event with the points in timestamp order, then cleared. Buffer capped (e.g. 5000 points) to bound memory.

## 2. `src/lib/orbit-geo.ts`

Thin TS wrapper:

- `registerPlugin<OrbitGeoPlugin>("OrbitGeo")`
- `isOrbitGeoAvailable()` → `Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("OrbitGeo")`
- `startOrbitGeo(onPosition, onError)` — requests permission, starts updates, subscribes to `orbitGeoPosition` and `orbitGeoBatch` (batch fires `onPosition` once per buffered point, in order)
- `stopOrbitGeo()` — removes listeners and stops updates
- Positions are converted to the existing `GeolocationPosition`-compatible shape already consumed by the tracker, so no calculation code changes.

## 3. `src/hooks/use-run-tracker.ts`

Minimal edit inside the existing native branch of `armGps` and the matching stop/cleanup:

- If `isOrbitGeoAvailable()`, use `startOrbitGeo(...)` instead of `nativeWatchPosition(...)`; keep the current `@capacitor/geolocation` path as fallback and the browser path unchanged.
- Store the handle in a new ref and call `stopOrbitGeo()` wherever the native watch is currently cleared.
- Replayed background points flow through the same `handlePosition` function, so distance, pace, splits and elevation are computed exactly as today.

## 4. `scripts/apply-ios-template.mjs`

Extend the existing script (keeps the current Info.plist copy):

- Copy `templates/ios/OrbitGeo.swift` → `ios/App/App/OrbitGeo.swift`
- Register the file in `ios/App/App.xcodeproj/project.pbxproj` (PBXBuildFile + PBXFileReference + Sources build phase + App group), idempotently — skip if already present
- Log clear next steps (`npx cap sync ios`)

## 5. Info.plist

`templates/Info.plist` already contains `UIBackgroundModes = [location, audio]`, `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`. No change needed; verified during implementation.

## Verification before publishing

After the edits I will list every changed file so you can review the diff, and confirm nothing outside the list above was modified.
