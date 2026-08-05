# Native iOS background GPS (isolated change)

Add a small native location plugin so tracking keeps running when the screen is locked or the app is backgrounded, and points recorded while in background are replayed into the run when the app resumes — with no point loss and no duplicates. Nothing else in the app is touched.

## Scope

Only these files change:

1. `templates/ios/OrbitGeo.swift` (new)
2. `src/lib/orbit-geo.ts` (new)
3. `src/hooks/use-run-tracker.ts` (native watch path only)
4. `scripts/apply-ios-template.mjs` (copy + Xcode target registration)
5. `templates/Info.plist` (verify keys only — see note)

Explicitly untouched: `Onboarding.tsx`, `BottomNav.tsx`, keyboard/resize config, visualViewport logic, global overflow / pointer-events / body-lock CSS, dialogs, sheets, inputs, app-shell layout, and all run calculation logic.

## 1. `templates/ios/OrbitGeo.swift`

Capacitor 8 plugin (project uses `@capacitor/core` 8.3.3, `@capacitor/ios` 8.3.3), implemented as:

```swift
@objc(OrbitGeoPlugin)
public class OrbitGeoPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "OrbitGeoPlugin"
  public let jsName = "OrbitGeo"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "flush", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise),
  ]
}
```

`CLLocationManager` config: `kCLLocationAccuracyBestForNavigation`, `activityType = .fitness`, `distanceFilter = 5`, `allowsBackgroundLocationUpdates = true`, `pausesLocationUpdatesAutomatically = false`, `requestAlwaysAuthorization`.

**Disk-persisted ring buffer**
- Every fix is appended to a ring buffer persisted to a JSON/NDJSON file in the app's Application Support directory (capped, e.g. 20 000 points; oldest overwritten). Writes are batched/debounced and done on a serial queue so background writes survive app termination.
- While the app is active, each fix is also emitted live as `orbitGeoPosition`.
- **No automatic clearing on `didBecomeActive`.** The plugin does not drop anything on resume.

**flush / acknowledge contract**
- `flush()` returns `{ points: [...], through: <last timestamp> }` — buffered points, timestamp-ordered. It does not delete anything.
- `acknowledge({ through })` deletes only points with `timestamp <= through` from the persisted buffer. Anything newer stays for the next flush.

## 2. `src/lib/orbit-geo.ts`

- `registerPlugin<OrbitGeoPlugin>("OrbitGeo")`
- `isOrbitGeoAvailable()` → `Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("OrbitGeo")`
- `startOrbitGeo(onPosition, onError)` in this strict order:
  1. request permission
  2. **add the `orbitGeoPosition` listener**
  3. `start()`
  4. `flush()` → replay returned points → `acknowledge({ through })`
  so neither the first live fix nor replayed fixes can be lost.
- On app resume (`@capacitor/app` `appStateChange` → active) the same `flush → replay → acknowledge` cycle runs.
- **Ordering + dedupe:** the wrapper keeps the last emitted timestamp and a small recent-timestamp set; incoming live and replayed points are sorted by timestamp and any point whose timestamp is already emitted is dropped. `onPosition` therefore sees a strictly increasing, duplicate-free stream.
- Points are converted to the existing `GeolocationPosition`-compatible shape the tracker already consumes.

## 3. `src/hooks/use-run-tracker.ts`

Minimal edit inside the existing native branch of `armGps` plus its stop/cleanup:

- If `isOrbitGeoAvailable()`, use `startOrbitGeo(...)` instead of `nativeWatchPosition(...)`; the `@capacitor/geolocation` path stays as fallback (Android/other) and the browser path is unchanged.
- New ref holds the handle; `stopOrbitGeo()` is called wherever the native watch is currently cleared.
- Replayed points flow through the existing `handlePosition`, so distance, pace, splits and elevation math is untouched.

## 4. `scripts/apply-ios-template.mjs`

Extends the existing script (keeps the Info.plist copy):

- Copy `templates/ios/OrbitGeo.swift` → `ios/App/App/OrbitGeo.swift`
- Idempotently register the file in `ios/App/App.xcodeproj/project.pbxproj` (PBXBuildFile, PBXFileReference, App group, Sources build phase)
- Verify/ensure the App target has **Background Modes → Location updates**: check `UIBackgroundModes` contains `location` in the written Info.plist and add the `com.apple.developer.background-modes`-equivalent capability entry (`SystemCapabilities`/background mode) in the pbxproj target if absent; log a hard warning if it cannot be set automatically.
- Print next step: `npx cap sync ios`

## 5. Info.plist

`templates/Info.plist` already has `UIBackgroundModes = [location, audio]`, `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`. Verified only — no content change expected.

## Before publishing

I will run `git diff --name-only` and show the full diff, confirming no file outside the five listed above was touched.
