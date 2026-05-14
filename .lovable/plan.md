## Indoor / Outdoor mode for Orbit Run

### 1. Profile setting (global)

**`src/lib/user-profile.ts`**
- Add `activityEnvironment: "outdoor" | "indoor"` to `UserProfile` (default `"outdoor"`).
- Persisted in the existing `localStorage` profile blob, broadcasts via the existing `orbit:profile-update` event.

**`src/routes/profile.tsx`**
- New minimalist segmented toggle ("Outdoor" / "Indoor") inserted directly under the Member Card section, using the same glass/border styling as other Profile rows.
- Updates profile via `saveProfile()` so every consumer (`useRunTracker`, `RunPage`, `FocusRunView`) reacts immediately.

**`src/lib/i18n.tsx`** — add EN/DA keys: `profile.environment.title`, `profile.environment.outdoor`, `profile.environment.indoor`, `profile.environment.hint`.

### 2. Smart sensor source

New file **`src/lib/motion-source.ts`**:
- Type `MotionSource = "gps" | "watch" | "phone" | "camera"`.
- `pickIndoorSource(opts)` returns the active source given:
  1. BLE/Apple Watch HR connected → `"watch"` (HR + cadence from BT cadence/SPM characteristic when available, else accelerometer cadence as backup).
  2. Phone moves with sustained accel variance > threshold → `"phone"` (pocket mode).
  3. Phone is still (low accel variance for 5 s) and camera permission granted → `"camera"` (holder mode).

New file **`src/lib/cadence-accelerometer.ts`**:
- Wraps `DeviceMotionEvent` (web) and `@capacitor/motion` (native) to compute steps/min via peak detection on the magnitude of `accelerationIncludingGravity`. Exposes `start(cb)` / `stop()` returning live `cadenceSpm` and an integrated step-derived `distanceM` using the user's stride (heuristic: `0.413 * heightCm / 100` fallback `0.78 m`).
- Used to drive distance + cadence indoors when GPS is disabled.

New file **`src/lib/cadence-camera.ts`**:
- Holder mode. Opens front camera via `navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })`, downsamples each frame to a small canvas, computes per-frame mean luminance delta as a 1-D signal, and runs an FFT/peak-detector to estimate cadence (steps/min in the 120–220 range).
- Permission request gated behind a one-time confirm sheet; gracefully no-ops on web preview when permission denied.

**`src/hooks/use-run-tracker.ts`**:
- Accept indoor mode (read from profile on `start()`).
- Indoor branch: skip `nativeWatchPosition` / `navigator.geolocation.watchPosition`, set `gpsReady = true` synthetically, set `hrSource`/`gpsAccuracyM` from the chosen motion source.
- Subscribe to the accelerometer module by default; switch to camera module if the phone is detected stationary for ≥5 s and camera was authorised.
- Distance + cadence are fed from `cadence-accelerometer` / `cadence-camera`; pace derived from distance/time. HR continues to come from BT/Health unchanged.
- Expose new state field `motionSource: MotionSource` in the tracker state.

### 3. Indoor run layout

**`src/components/IndoorRunView.tsx`** (new):
- Replaces `<RunMap />` and the existing carousel when `profile.activityEnvironment === "indoor"`.
- Layout:
  - **Hero**: `Pace` in massive neon-green display font (≈`text-[96px]`, `font-display font-black`, `text-neon`), labelled `PACE · MIN/KM` in muted-uppercase.
  - **2×2 grid** below: `Heart Rate (BPM)`, `Distance (km)`, `Time`, `Cadence (SPM)` — each tile uses the existing `StatTile` styling tokens (no custom hex).
- Pause / Resume / hold-to-stop controls reused from `FocusRunView` (extracted into a small `RunControls` subcomponent so both views share them).
- Spotify mini player block stays mounted below the stats.

**`src/components/FocusRunView.tsx`**:
- Branch at the top: if `activityEnvironment === "indoor"` render `<IndoorRunView />` instead of the map+carousel block. All the hooks (zone cues, pacing, hold-to-stop, HR spike banner) keep working.

**`src/routes/index.tsx`**:
- Static (pre-run) layout: when indoor mode is on, hide the map preview block and instead show the same hero/2×2 placeholder zeroed out, so the visual identity matches the active session.

### 4. Source indicator chip

**`src/components/SourceSignalChip.tsx`** (new, replaces `GpsSignalChip` at the call sites):
- Same pill chrome as `GpsSignalChip` (`glass-strong`, neon ping dot).
- Icon switches by `motionSource`:
  - `gps` → `Satellite`
  - `watch` → `Watch`
  - `phone` → `Smartphone` (the requested "wave/phone" icon)
  - `camera` → `Aperture` (lens)
- Label keys: `source.gps`, `source.watch`, `source.phone`, `source.camera` (EN/DA).

**`src/routes/index.tsx`** + **`src/components/FocusRunView.tsx`**:
- Replace `<GpsSignalChip />` with `<SourceSignalChip source={t.motionSource} accuracyM={t.gpsAccuracyM} />` in the top-right of both the static page and the active run view.

### 5. Design finish
- Numbers in neon (`text-neon`), labels in `text-muted-foreground` uppercase tracking, all via existing tokens — no hard-coded hex.
- Mode switch is instant: `RunPage` and `FocusRunView` re-render on `orbit:profile-update`. The indoor layout mounts in the same DOM slot as the map container so the transition is a simple unmount/mount with no animation jank.

### Out of scope / assumptions
- Marathon-grade indoor accuracy (treadmill calibration UI) is not part of this change — stride length uses the heuristic above; we can add a "calibrate stride" affordance later.
- Camera-based cadence is a best-effort luminance/motion estimate; if no signal is detectable for 10 s the tracker silently falls back to the accelerometer source.
- BLE cadence-from-strap requires a strap that exposes the standard Running Speed and Cadence service; if absent we keep cadence from accelerometer even when HR comes from `"watch"`.

### Files
- new: `src/components/IndoorRunView.tsx`, `src/components/SourceSignalChip.tsx`, `src/lib/motion-source.ts`, `src/lib/cadence-accelerometer.ts`, `src/lib/cadence-camera.ts`
- edited: `src/lib/user-profile.ts`, `src/lib/i18n.tsx`, `src/routes/profile.tsx`, `src/routes/index.tsx`, `src/components/FocusRunView.tsx`, `src/hooks/use-run-tracker.ts`
- `src/components/GpsSignalChip.tsx` kept as a thin re-export wrapper for backwards compat (or removed if unused after migration).
