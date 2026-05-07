## Production-readiness for Orbit Run (Capacitor + Xcode)

### 1. Capacitor app identity (`capacitor.config.ts`)
- Change `appId` → `com.orbitrun.app`
- Change `appName` → `Orbit Run`
- Keep `webDir: "dist/client"` (matches TanStack Start's actual build output — the app is built with Vite to `dist/client`, NOT `dist`. Changing it to `dist` would break `npx cap sync`).
- Keep the existing checklist comments.

### 2. iOS purpose strings (`docs/IOS_SETUP.md`)
Update the Info.plist snippet so the Danish, brand-aligned copy you gave is the canonical text:
- `NSHealthShareUsageDescription` → "Orbit Run bruger dine sundhedsdata (puls, søvn og HRV) til at lade Orbit Coach beregne din daglige form og optimere din træning."
- `NSHealthUpdateUsageDescription` → "Orbit Run gemmer dine løbeture i Apple Health."
- `NSLocationWhenInUseUsageDescription` → "Orbit Run bruger GPS til at måle din distance og rute præcist under løb."
- Keep the existing `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes`, `NSMotionUsageDescription`, `NSBluetoothAlwaysUsageDescription` keys (all required for background GPS + BLE HR strap + steps).

These keys are written by hand into `ios/App/App/Info.plist` after `npx cap add ios` — Capacitor cannot inject them from `capacitor.config.ts`.

### 3. Spotify "Auto-wake" on START
The wiring already exists (`MusicHub` listens for `orbit:run-start` → `startActivePlaylist` → `transferPlayback` → `waitForActiveDevice` → `playContext`). Two small hardenings:
- **Pre-warm on app open**: `MusicHub` already auto-transfers on mount when authed. Extend that to also call `waitForActiveDevice(deviceId, 1500)` so the iPhone is *guaranteed* active before the user taps START. Today the warm-up fires `transferToFirstDevice()` and forgets.
- **START path**: in `startActivePlaylist`, if a playlist is selected but `playContext` returns 404 (device went to sleep between transfer and play), retry once after a fresh `transferPlayback` + `waitForActiveDevice`. This is the single most common cause of "music didn't start" on physical devices.

No changes needed to PKCE/OAuth — already correct.

### 4. GPS BestForNavigation from app open
Native bridge already maps `enableHighAccuracy: true` → `kCLLocationAccuracyBestForNavigation`. Today the watch only starts when the user taps START (`use-run-tracker.start()`). Add a tiny pre-warm:
- In `src/routes/__root.tsx`, on mount: if `isNativeGeolocationAvailable()`, call `requestNativeGeolocationPermission()` then a single `nativeGetCurrentPosition()` to wake the GPS chip. This means the first fix on the home screen is sub-second and the run starts with `gpsReady = true`.
- On web, fall back to `navigator.geolocation.getCurrentPosition({enableHighAccuracy:true})` once for the same warm-up.

### 5. Coach welcome + High Five animation
In `CoachOnboarding.tsx` (the `thinking === "phaseB"` final screen, currently shows `coach.thinking.done` + goal preview):
- Add a personalized greeting line ABOVE the goal card using the user's stored display name + the freshly entered weight/height:
  - DA: "Velkommen {name}! Jeg har kalibreret din profil med din vægt på {weight} kg og højde på {height} cm…"
  - EN equivalent.
  - Gracefully omit the weight/height phrase if either field was left blank.
- Replace the static `Sparkles` puck with a celebratory **High Five** moment:
  - Big animated check (`lucide-react` `CheckCircle2`) with a `scale-in` + `glow` keyframe pulse.
  - Tailwind keyframes `high-five` (rotate -10° → 10° → 0°, scale 0.6 → 1.1 → 1) defined in `src/styles.css`.
  - Subtle confetti via 8 absolutely-positioned dots animating outward (CSS only — no new dependencies).
- Add new i18n keys `coach.welcome.personal` (DA + EN) with `{name}/{weight}/{height}` interpolation.

### 6. Build & GitHub
- Production build runs automatically in Lovable's pipeline; no manual step needed.
- GitHub sync is **bidirectional and automatic** once the repo is connected (Plus menu → GitHub → Connect project). After this plan is implemented, every change pushes to GitHub in real time — you can `git pull` straight into the Xcode workspace and run `npx cap sync ios`.
- I'll include a one-line note in `docs/IOS_SETUP.md` linking the local Xcode workflow to the GitHub sync.

### Files to edit
- `capacitor.config.ts`
- `docs/IOS_SETUP.md`
- `src/components/MusicHub.tsx`
- `src/lib/spotify.ts` (small retry helper)
- `src/routes/__root.tsx` (GPS warm-up)
- `src/components/CoachOnboarding.tsx`
- `src/lib/i18n.tsx`
- `src/styles.css` (high-five + confetti keyframes)

### Out of scope (flagging up front)
- Cannot run `git push` from inside Lovable — GitHub is handled by the platform's bidirectional sync, not by me.
- No changes to onboarding logic / data model — purely the welcome screen visuals + copy.
- No new npm packages.
