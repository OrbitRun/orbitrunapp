## Reality check first

Your app is a **TanStack Start web app** on Cloudflare Workers. **Apple HealthKit is iOS-native only** — no browser/PWA can read it. To actually receive heart rate from Apple Health you need:

1. A **Capacitor iOS shell** wrapping this web app, **and**
2. Building/signing in **Xcode** with the HealthKit entitlement, **and**
3. Distributing via **TestFlight / App Store**.

Lovable produces the web bundle the native shell loads — it cannot build/sign the iOS binary. What I **can** do now is build all the app-side plumbing so the moment you wrap this in Capacitor, heart rate just works. On the web it stays cleanly inert.

## What I'll build (web-safe, native-ready)

### 1. Health bridge — `src/lib/health.ts`
Thin abstraction over `@capacitor-community/health` (maintained HealthKit plugin):
- `isHealthAvailable()` — true only inside Capacitor on iOS.
- `requestHeartRatePermission()` — prompts read access for `HKQuantityTypeIdentifierHeartRate`. Returns `'granted' | 'denied' | 'unavailable'`.
- `getLatestHeartRate()` — queries the most recent BPM sample (last ~30s window).
- `startHeartRatePolling(cb, intervalMs = 5000)` / `stopHeartRatePolling()` — interval poller (HealthKit has no true HR push without a watchOS companion; 5s polling is the standard pattern).

All Capacitor calls are **dynamic-imported** and try/catch'd so the module never breaks the web bundle (Cloudflare Worker SSR + browser).

### 2. Permission flow UI
- New `src/components/HealthPermissionSheet.tsx`: bottom sheet explaining what data is read and why, "Allow" / "Not now" actions. Shown automatically on first run start in a Capacitor build, gated by `localStorage` flag `orbit:health:asked`.
- `src/routes/profile.tsx`: new "Apple Health" row showing status (Connected / Denied / Not available) with re-prompt button.

### 3. Run tracker integration — `src/hooks/use-run-tracker.ts`
- Extend `GeoPoint` in `src/lib/run-types.ts` with optional `hrBpm: number | null`.
- Extend `Run` with `avgHrBpm?`, `maxHrBpm?`, and `hrSeries?: { t: number; bpm: number }[]` so HR is captured even when standing still (no new GeoPoint).
- On `start()`: `startHeartRatePolling` (no-op on web). Each poll updates a `latestBpmRef` and appends to `hrSeries`.
- In `handlePosition`: stamp `latestBpmRef` onto each new `GeoPoint`.
- On `stop()`: `stopHeartRatePolling`, compute avg/max, persist on the `Run`.

### 4. Run history & summary
- Add HR tile (avg / max BPM) to `src/components/RunSummary.tsx` and `src/routes/run.$id.tsx`. Hidden when no HR data — older runs unaffected.

### 5. Capacitor scaffold (config + docs only — NOT installed in web build)
Capacitor cannot run inside the Cloudflare Worker bundle, so I will **not** add `@capacitor/core` to `package.json` (would bloat / risk SSR errors). Instead:
- `capacitor.config.ts` — appId `app.lovable.orbit`, webDir `dist/client`, iOS plist hint for `NSHealthShareUsageDescription`.
- `docs/IOS_SETUP.md` — exact recipe to wrap the app: `bun add @capacitor/core @capacitor/cli @capacitor/ios @capacitor-community/health`, `npx cap add ios`, add HealthKit capability in Xcode, etc.

This keeps the web build clean while giving a one-shot path to a working iOS build later.

## Files touched

```text
src/lib/health.ts                        (new — bridge, web-safe)
src/lib/run-types.ts                     (add hrBpm, avgHrBpm, maxHrBpm, hrSeries)
src/hooks/use-run-tracker.ts             (poll + stamp + aggregate)
src/components/HealthPermissionSheet.tsx (new)
src/components/RunSummary.tsx            (HR tile)
src/routes/profile.tsx                   (Apple Health row)
src/routes/run.$id.tsx                   (HR tile in detail view)
src/routes/index.tsx                     (mount permission sheet on first run)
capacitor.config.ts                      (new — config only)
docs/IOS_SETUP.md                        (new — wrapping recipe)
```

## What you need to know

- **In the current web preview, this code is dormant.** `isHealthAvailable()` returns false, the sheet never appears, runs save with `hrBpm: null`. Nothing visible changes for web users.
- **To actually get HR data**, you (or a developer) must follow `docs/IOS_SETUP.md` to wrap in Capacitor and submit through Xcode. Lovable cannot do that step.
- **5s polling is the iOS HealthKit norm** for live HR during workouts. True push streaming requires a watchOS companion app — out of scope.

Approve and I'll implement everything above.