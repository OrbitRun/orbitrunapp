## Auto-Pause & Flight Recorder

Two opt-in safety nets for tracking, both controlled from Profile (same row style as the Coach toggle), with the choice persisted to `UserProfile`.

### 1. Smart Auto-Pause

While `status === "running"`, the tracker monitors the rolling speed window already maintained for live pace.

- If average speed over the last **10 s** drops below **0.5 m/s** (≈3:20 km/h walking pace) AND distance moved < 5 m, fire `pause()` automatically.
- Once paused by auto-pause, watch new GPS samples: when speed climbs back above **1.2 m/s** for **3 s** continuously, fire `resume()` automatically.
- Auto-pause never overrides a *manual* pause — manual pauses persist until the user manually resumes.
- Voice cue (gated by `prVoiceEnabled`): short "Auto-pause" / "Resumed" callouts, throttled.
- A small `AUTO PAUSE` chip is appended to the existing focus-mode chip bar while the auto-pause is active so the runner knows what happened.

### 2. Flight Recorder (offline buffer)

Every successful GPS update is appended to a rolling localStorage buffer so a crash, refresh, or app kill in mid-run never loses the data.

- Buffer key: `orbit:flight-recorder:v1` — `{ runId, startedAt, points: GeoPoint[], splits: Split[], hrSeries: HrSample[], lastSavedAt }`.
- Flushed (debounced ~1 s) on every state mutation while running/paused.
- Cleared on `commitRun()` or `discardRun()`.
- On app boot (root layout effect), if a non-stale buffer exists (started within last 24 h, ≥30 s of data, no matching saved Run), surface a one-time **"Recover unsaved run?"** banner that lets the user save it or discard.
- Recovery saves the partial Run via `saveRun()` and runs the same PR check pipeline.

### 3. Settings UI

In `src/routes/profile.tsx`, add **two new rows in the same Coach-style section, placed directly below the existing "Orbit Coach" section** (above HR zones), each a single tappable row that toggles on/off:

| Row | Icon | Default |
|-----|------|---------|
| Auto-pause | `PauseCircle` | **on** |
| Flight Recorder | `ShieldCheck` | **on** |

State stored on `UserProfile`:

```ts
type UserProfile = {
  // …existing
  autoPauseEnabled?: boolean;       // default true
  flightRecorderEnabled?: boolean;  // default true
};
```

Backwards-compatible: missing keys are treated as `true` (`!== false` pattern, matching `coachEnabled`).

### Files to add

- `src/lib/flight-recorder.ts` — `saveSnapshot`, `loadSnapshot`, `clearSnapshot`, `hasRecoverableSnapshot`, `snapshotToRun`. Pure helpers around `localStorage`.
- `src/components/RecoverRunBanner.tsx` — fixed-position banner shown on home route when a snapshot is recoverable.
- `src/hooks/use-recover-run.ts` — checks the buffer on mount and exposes `{ snapshot, save, discard }`.

### Files to edit

- `src/lib/user-profile.ts` — add the two optional flags to `UserProfile` and `DEFAULT_PROFILE`.
- `src/hooks/use-run-tracker.ts` —
  - Read `autoPauseEnabled` + `flightRecorderEnabled` on `start()` into refs.
  - Auto-pause logic inside the existing `setState` block in `handlePosition` (computes movement window from the same `recent` array used for rolling pace).
  - On every mutation while running/paused, debounced flush to flight recorder.
  - Add `autoPaused` boolean state so the UI chip can show it; cleared on manual pause/resume.
  - Clear snapshot in `commitRun` and `discardRun`.
- `src/routes/profile.tsx` — insert the two toggle rows directly under the Orbit Coach section (above the HR zones row), matching the row style used for Coach.
- `src/routes/__root.tsx` (or `src/routes/index.tsx`) — mount `<RecoverRunBanner />` so the prompt is visible right after app launch.
- `src/lib/i18n.tsx` — keys: `profile.autoPause`, `profile.autoPause.on`, `profile.autoPause.off`, `profile.flightRecorder`, `profile.flightRecorder.on`, `profile.flightRecorder.off`, `recover.title`, `recover.body`, `recover.save`, `recover.discard`, `focus.autoPause`, `cue.autoPaused`, `cue.autoResumed` (en + da).
- `src/components/FocusRunView.tsx` — render `AUTO PAUSE` chip in the existing chip bar when tracker exposes `autoPaused === true`.

### Technical details

- Auto-pause thresholds tuned to avoid false triggers at traffic lights (10 s observation) and false negatives on slow uphill walks (0.5 m/s floor, well under jogging).
- Flight recorder writes use a `requestIdleCallback`-with-fallback debounce so heavy GPS bursts don't stall the main thread.
- Snapshot freshness = `startedAt` within last 24 h. Older snapshots auto-discarded silently.
- Recovery banner only appears on `/` to avoid interrupting an active run on `/run/$id`.
- No backend changes — pure client-side persistence in `localStorage`.
