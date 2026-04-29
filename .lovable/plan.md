## Expand Heart Rate Analytics

Build out four HR-driven features that plug into the existing infrastructure (`use-run-tracker`, `hr-analysis`, `stat-metrics`, `RunSummary`).

### 1. Live Max HR + Avg HR tiles in Focus Mode

In `src/hooks/use-run-tracker.ts`, expose two new live values alongside `hrBpm`:
- `maxHrBpm` — running max of every sample fed through `noteBpmSample`.
- `avgHrBpm` — time-weighted mean of `hrSeriesRef` (already maintained).

Reset both in `start()` and clear in `reset()`. Surface them in the tracker return object.

In `src/lib/stat-metrics.ts`:
- Extend `LiveStats` with `maxHrBpm` and `avgHrLiveBpm`.
- Add metrics: `hrMax` ("Max HR", bpm) and `hrAvg` ("Avg HR", bpm).
- Append both to `ALL_METRIC_IDS` so they appear in the swipable carousel and in `MetricPicker`.

In `src/components/FocusRunView.tsx`, no structural change needed — the carousel already iterates `ALL_METRIC_IDS`. Just add the new ids to the i18n labels.

### 2. VO2 Max estimate ("Orbit Fitness Score")

New file `src/lib/vo2max.ts`:
- `estimateVo2Max(run): number | null` using the **Uth–Sørensen–Overgaard–Pedersen** formula:
  `VO2max ≈ 15.3 × (HRmax / HRrest)`
  with HRmax from `maxHrBpm` (fallback to `DEFAULT_MAX_HR`) and HRrest from user profile (default 60).
- Validity gate: only return a value when run ≥10 min, has avgHrBpm, and avgHrBpm ≥ 60% of HRmax. Otherwise null.
- Expose helper `classifyFitness(vo2, ageOptional)` returning a band label key (`vo2.poor` / `fair` / `good` / `excellent` / `elite`).

Persist on the run:
- Add `vo2maxEst?: number` to `Run` in `src/lib/run-types.ts`.
- Compute and store in `use-run-tracker.stop()` before `saveRun`.

UI:
- Show inside `BioInsightCard` (or new `Vo2Card`) titled **"Orbit Fitness Score (VO2 Max Est.)"** with the disclaimer line "Estimate — needs 10+ min steady running for accuracy."
- Render in `RunSummary` and `routes/run.$id.tsx`.

### 3. Zone Tracker bar chart

New file `src/lib/hr-zones.ts`:
- `timeInZones(hrSeries, maxHr): { zone: 1-5, ms: number, pct: number }[]` — time-weighted, mirroring `timeFractionInZone5` logic but for all 5 zones.

New component `src/components/HrZoneBar.tsx`:
- Minimalist horizontal stacked bar (5 segments, one per zone) with subtle color ramp from neon-cool (Z1) to neon-hot (Z5) using existing tokens.
- Underneath: a 5-row legend `Z1 · 24% · 12:34`, monospace, uppercase eyebrow style matching `RecoveryInsight`.

Render in `RunSummary` and `routes/run.$id.tsx` whenever `hrSeries` has ≥2 samples.

### 4. Recovery Score (60s HRR fitness rating)

Extend the existing post-stop HRR pipeline (already captures 75s of post-stop HR):
- After `hrrDrop60s` is computed, classify into a fitness grade:
  - ≥40 bpm → Elite
  - 30–39 → Excellent
  - 20–29 → Good
  - 12–19 → Fair
  - <12 → Poor
- Expose `recoveryGrade` on the Run type and update via `updateRun` in the same `orbit:run-updated` dispatch.

UI — countdown at finish:
- New component `src/components/HrrCountdown.tsx`. When `RunSummary` mounts and we have an active BT/Health connection (check `tracker.hrSource` snapshot just before finish, persisted in a ref), show a 60-second countdown card at the top:
  - Big circular ring (reusing the SVG ring pattern from `FocusRunView` stop button).
  - Label "Measuring recovery — keep your strap on".
  - Live BPM tick.
  - When timer hits 0 (or `orbit:run-updated` fires with `hrrDrop60s`), morph into a result card showing the BPM drop and the grade badge.
- Skip the countdown automatically if no HR source was active during the run (graceful fallback to existing `BioInsightCard`).

i18n — add Danish + English keys for: `hr.max`, `hr.avg`, `vo2.title`, `vo2.disclaimer`, `vo2.poor|fair|good|excellent|elite`, `zones.title`, `zones.z1..z5`, `hrr.countdown.title`, `hrr.countdown.body`, `hrr.grade.poor..elite`.

### Technical details

- All math lives in pure modules (`vo2max.ts`, `hr-zones.ts`) — no React, easy to unit-test later.
- `Run` type gains two optional fields: `vo2maxEst?: number`, `recoveryGrade?: "poor"|"fair"|"good"|"excellent"|"elite"`. Backward compatible — old runs simply hide the new tiles.
- `noteBpmSample` already runs on every BT + Health sample, so live max/avg need only one extra ref + one setState per sample (already throttled by sample rate).
- Stat carousel re-render cost is unchanged — same iteration, two extra entries.
- HRR countdown uses the existing 75s post-stop window, so no new GATT subscriptions are introduced.

### Files to create
- `src/lib/vo2max.ts`
- `src/lib/hr-zones.ts`
- `src/components/HrZoneBar.tsx`
- `src/components/HrrCountdown.tsx`

### Files to edit
- `src/hooks/use-run-tracker.ts` — live max/avg HR, vo2/grade persistence
- `src/lib/stat-metrics.ts` — new metrics + LiveStats fields
- `src/lib/run-types.ts` — `vo2maxEst`, `recoveryGrade`
- `src/components/FocusRunView.tsx` — (no-op besides ensuring new metric ids render)
- `src/components/RunSummary.tsx` — HrrCountdown, HrZoneBar, VO2 card
- `src/components/BioInsightCard.tsx` — VO2 row + recovery grade badge
- `src/routes/run.$id.tsx` — same new sections for past runs
- `src/lib/i18n.tsx` — new keys (en + da)
