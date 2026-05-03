## Goal

Upgrade the AI coach into a hyper-personal advisor surfaced as a fixed **Daily Readiness Score** panel on the Dashboard (no modals). The panel combines resting HR, HRV, recent training load (TRIMP), personal HR zones, and current weather into one score plus a proactive coaching message.

## What the user will see (Dashboard, between greeting and CoachCard)

```text
┌─ READINESS ─────────────────  82 / 100 ──┐
│  ████████████████░░░░  Ready to train     │
│                                            │
│  Coach: "Great recovery — your HRV is up  │
│  4ms vs. baseline. Today's tempo run is   │
│  green-lit. It's 24°C & humid, so start   │
│  20s/km slower than goal pace."           │
│                                            │
│  Resting HR  52   HRV   68ms              │
│  7-day TRIMP 412  Trend  +8% (stable)     │
│  Weather     24°C · 78% humidity · clear  │
└────────────────────────────────────────────┘
```

Score < 70 → message recommends easy/rest day and the panel border tints amber/red. Score ≥ 85 → green tint + "go hard" nudge.

## Implementation

### 1. Score engine — `src/lib/readiness-engine.ts` (new)

Pure function `computeReadiness({ profile, runs, hrZones, vitals, weather })` returning:
```ts
{ score: 0..100, band: "rest"|"easy"|"ready"|"prime",
  components: { recovery, hrv, load, weather },
  trimp7d: number, trimp3d: number, loadTrend: number,
  recommendationKey: "readiness.rec.rest"|"...easy"|"...go"|"...heatAdjust",
  recommendationParams?: Record<string,string|number> }
```
Weighting (sum to 100):
- Recovery (resting HR vs. 28-day baseline): 25
- HRV (today vs. 28-day baseline, higher = better): 25
- Acute load (3-day TRIMP) vs. chronic (28-day TRIMP/9.3) ratio: 30 — penalise > 1.3 (overreach), reward 0.8–1.2
- Weather penalty (heat/humidity/wind for outdoor sessions): 20

### 2. TRIMP — extend `src/lib/run-types.ts` + `recovery-engine.ts`

- Add optional `trimp?: number` and `intensityFactor?: number` to `Run`.
- Compute on run save in `use-run-tracker.ts` finalizer:
  `TRIMP = durationMin × HRr × 0.64 × e^(1.92 × HRr)` (Banister, men) where `HRr = (avgHR − restHR) / (maxHR − restHR)`. Falls back to `durationMin × rpe` when HR is missing.
- Add `weeklyTrimp(runs, days=7)` helper used by the score engine and exposed in the panel.

### 3. Personal HR thresholds — `src/lib/hr-zones-config.ts` already supports manual `restingHr` + `maxHr`

- The route `/profile/heart-rate` already lets the user enter age, restingHr, maxHr (Karvonen). It's reachable but not surfaced from the Dashboard.
- Add an inline "Personalize zones" link in the Readiness panel when the user is still on default values (`source !== "manual"` and resting/max HR untouched), routing to `/profile/heart-rate`.
- Add Apple Health import button on that route: call existing `health.ts` to pull resting HR + HRV samples (already wired for HR; extend with `fetchVitals()` returning `{ restingHr, hrvMs }` — guarded by `Capacitor.isNativePlatform()`).

### 4. Vitals store — `src/lib/vitals.ts` (new)

LocalStorage at `orbit:vitals:v1`:
```ts
type Vitals = { restingHr?: number; hrvMs?: number; updatedAt: number;
                history: Array<{ t: number; restingHr?: number; hrvMs?: number }> }
```
Helpers: `loadVitals`, `saveVitals`, `vitalsBaseline(history, days=28)`, manual entry on the heart-rate page (two number inputs), plus an optional Health import button.

### 5. Weather integration — reuse `src/lib/weather.ts`

- Add `fetchCurrentEnv(lat, lng)` extending Open-Meteo current vars to include `relative_humidity_2m` and `apparent_temperature`. Cache in `sessionStorage` for 30 minutes.
- Use the user's last known location (last run's final point) to fetch on mount; gracefully skip if unavailable.
- Heat penalty: subtract up to 20 points using apparent temperature (>22°C scaled, >30°C max); humidity > 70% adds penalty; wind > 8 m/s small penalty. Recommendation key switches to `readiness.rec.heatAdjust` with a pace-shift suggestion (`+15s/km` per 5°C above 18°C apparent).

### 6. Dashboard panel — `src/components/ReadinessPanel.tsx` (new)

- Mounted in `src/routes/index.tsx` immediately after the greeting and before `<RecoverRunBanner />`/`<CoachCard />`, only when `t.status === "idle" || "finished"`.
- Visual: glass card matching `RecoveryStatus`/`CoachCard` styles. Big tabular score, neon progress bar, coloured ring (red < 60, amber 60-74, neon 75-100), proactive coach line (uses i18n keys), and a 4-stat sub-grid (resting HR, HRV, 7-day TRIMP, weather chip).
- Uses `useUserProfile`, `useHrZones`, `loadRuns()`, new `useVitals()` and `useEnv()` hooks; recomputes via `useMemo` and on `orbit:run-updated`/`orbit:vitals-update`/`orbit:hr-zones-update` events.

### 7. CoachCard tie-in

- Pass readiness to existing `CoachCard` so when score < 70 the displayed session downgrades (`easy → walkRun`, `intervals → easy`, `tempo/long → easy short`) and the existing zone-5 override message is replaced with the readiness recommendation. No layout change — same card, smarter copy.

### 8. i18n

Add EN + DA strings under namespaces:
- `readiness.title`, `readiness.band.rest|easy|ready|prime`
- `readiness.metric.restingHr|hrv|trimp7d|trend|weather`
- `readiness.rec.rest|easy|go|heatAdjust|missingData`
- `readiness.cta.personalize`, `readiness.cta.logVitals`

### 9. Files touched

New:
- `src/lib/readiness-engine.ts`
- `src/lib/vitals.ts`
- `src/components/ReadinessPanel.tsx`
- `src/hooks/use-vitals.ts`
- `src/hooks/use-current-env.ts`

Edited:
- `src/lib/run-types.ts` (add `trimp`, `intensityFactor` fields)
- `src/lib/recovery-engine.ts` (export `weeklyTrimp` helper, optional)
- `src/hooks/use-run-tracker.ts` (compute TRIMP at run finalize)
- `src/lib/weather.ts` (extend current fetch with humidity/apparent temp)
- `src/routes/index.tsx` (mount `ReadinessPanel`)
- `src/routes/profile_.heart-rate.tsx` (add vitals inputs + Health import button + link visibility from dashboard)
- `src/components/CoachCard.tsx` (downgrade recommendation when readiness < 70)
- `src/lib/i18n.tsx` (new strings, EN/DA)

### Open question

For HRV import on web (no Apple Health), we'll show a manual entry field. On native iOS we'll pull `HKQuantityTypeIdentifierHeartRateVariabilitySDNN` via the existing `health.ts` bridge. OK to proceed with manual-entry-first and treat Health import as a follow-up if the bridge isn't ready?
