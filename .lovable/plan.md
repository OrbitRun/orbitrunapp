# Performance Prediction

A new collapsible section on the Orbit Coach page that estimates race times for 5K, 10K, half marathon and marathon, compares them to a 30-day-old snapshot, and feeds the trend back into the daily coach briefing.

## 1. UI: new collapsible card on the Coach page

New file `src/components/PerformancePredictionCard.tsx`, mounted in `src/routes/coach.tsx` directly under `<CoachCard />`.

Visual treatment matches the existing Orbit Coach card:
- `glass rounded-2xl p-4` container with the same header pattern (icon tile + title + eyebrow).
- Lucide `TrendingUp` icon in a `bg-white/5` rounded tile, neon foreground.
- Title: `Performance Prediction` (i18n).
- Same neon collapse button as the "Show session" button on `CoachCard` (`bg-neon/10 border border-neon/30 text-neon … uppercase tracking-[0.15em]`), label toggles between `Show predictions` / `Hide`.
- Collapsed state shows just the header + CTA. Expanded state reveals four distance rows.

Each distance row (minimal, lots of whitespace, typography-led):

```text
5K              19:42      ▲ −18s vs last month
10K             41:05      ▲ −34s vs last month
HALF          1:31:20      — no baseline yet
MARATHON      3:12:55      Theoretical potential
```

- Distance label: `text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold`.
- Time: `font-display font-black text-2xl tabular`.
- Delta line: `text-[11px]` — neon when faster, muted when slower or unchanged, with a small `ArrowUp` / `ArrowDown` (lucide) glyph. Color stays subtle (no destructive red).
- Marathon (and any distance for which the user has never run ≥15 km) gets the eyebrow label `Theoretical potential` next to the time and an `Info` icon that, on tap, shows a one-line tooltip via the existing `InfoHint` component.
- Rows separated by `border-t border-white/5 pt-3 mt-3` to mirror the Vo2Max divider in `CoachCard`.

No new colors. All styling stays inside semantic tokens already in `src/styles.css` (`text-neon`, `text-muted-foreground`, `border-white/5`, `bg-white/5`).

## 2. Prediction algorithm

New file `src/lib/performance-prediction.ts`. Pure functions, no React.

Inputs: `Run[]` (from `loadRuns()`), a reference `now` timestamp.

Steps:

1. **Window the runs.** Take all runs with `endedAt >= now - 42 days` (6 weeks). If fewer than 2 qualifying runs, return `null` for all distances.
2. **Per-run race-equivalent time at distance D.** For each run, compute the best continuous time over D using the existing `bestTimeForPoints(run.points, D)` helper from `personal-records.ts` when `run.distanceM >= D`. If the run is shorter than D, project a time using a Riegel extrapolation from the run's full `(distanceM, durationMs)`:

   ```text
   T_D = T_run * (D / distanceM_run) ^ k
   ```

   Use `k = 1.06` for D ≤ 10 km and `k = 1.08` for half/marathon (slightly steeper than the textbook 1.06 to reflect endurance fade). Skip runs shorter than `0.4 * D` — too short to extrapolate meaningfully.
3. **Endurance anchor.** Find the longest run in the window (`L = max(distanceM)`). Multiply each projected `T_D` by an endurance factor

   ```text
   f = clamp(1 + max(0, (D - L) / D) * 0.04, 1.0, 1.20)
   ```

   so estimates beyond what the user has actually covered get progressively penalised (capped at +20%).
4. **Recency-weighted aggregate.** For each candidate `T_D`, weight by `w = exp(-ageDays / 21)` (3-week half-life-ish) AND by a quality weight `q = 1 / (1 + max(0, (D / runDistance) - 1))` so a 5 km projection trusts a 4 km run more than a 1.5 km sprint. Take the weighted minimum-of-best-3 (cheap robust estimator: sort `T_D * (1/qw)` ascending, take the lowest 3, return their weighted mean).
5. Return `{ "5k": ms, "10k": ms, "half": ms, "marathon": ms } | null per distance`.

Also export `hasLongRunFor(runs, distanceM)` returning `true` if any run in the window is `>= 0.7 * distanceM` (used to decide marathon "Theoretical potential" — falls back to the user's all-time longest to be lenient: marathon is theoretical if no run ever ≥ 15 km).

## 3. Trend storage (30-day comparison)

New file `src/lib/prediction-history.ts` — tiny localStorage log so we don't recompute history on every render.

Schema:

```ts
type PredictionSnapshot = {
  t: number; // ms timestamp
  values: { "5k"?: number; "10k"?: number; half?: number; marathon?: number };
};
const KEY = "orbit:prediction-history:v1";
```

API:
- `loadHistory(): PredictionSnapshot[]`
- `appendSnapshot(values)` — pushes if last entry is older than 6 hours (rate limit), trims to last 180 entries (~6 months at one snapshot/day max).
- `snapshotClosestTo(history, targetT, toleranceDays = 7)` — returns the snapshot whose `t` is closest to `targetT` within tolerance, or `null`.
- `monthlyDelta(history, current, distance)` — returns `{ deltaMs: number, baselineT: number } | null` comparing `current[distance]` against the snapshot closest to `now - 30 days` (±7 days window).

`PerformancePredictionCard` calls `appendSnapshot(currentPredictions)` once on mount whenever `runs.length > 0` and predictions are non-null. This gives us a continuously growing baseline without recomputing past predictions.

## 4. Coach briefing integration

`src/lib/coach-plan.ts` already drives the Coach card text. Add a new exported helper `predictionInsight(lang)` that:

- Calls `loadRuns()` + `predictRaceTimes(runs)` + `monthlyDelta(history, …, "10k")` (preferred distance: first of `10k`, `5k`, `half` that has a non-null delta).
- Returns an i18n-formatted sentence like: `Your projected 10K time has dropped 12s this month.` or `null` if no signal.

Surface this string in `CoachCard.tsx` as a discreet line beneath the existing `currentWeekAdjustment` note (same `text-[10px] text-neon font-bold uppercase tracking-[0.12em]` style), only rendered when non-null and trending faster (delta < 0).

This is a small additive read; no changes to plan or session logic.

## 5. i18n

Add to `src/lib/i18n.tsx` (English + Danish) under a new `prediction.*` namespace:

- `prediction.title` — "Performance Prediction" / "Performance-prognose"
- `prediction.eyebrow` — "Race time forecast" / "Forventet løbstid"
- `prediction.cta.show` / `prediction.cta.hide`
- `prediction.distance.5k` / `.10k` / `.half` / `.marathon`
- `prediction.delta.faster` — "{value} vs last month"
- `prediction.delta.slower` — "+{value} vs last month"
- `prediction.delta.none` — "no baseline yet"
- `prediction.theoretical` — "Theoretical potential" / "Teoretisk potentiale"
- `prediction.theoretical.info` — short tooltip explaining the user hasn't run ≥15 km yet
- `prediction.empty` — shown when fewer than 2 runs in the last 6 weeks
- `prediction.coach.fasterMonth` — "Your projected {distance} time has dropped {value} this month."

## 6. Out of scope

- No backend / Supabase changes; everything is local.
- No changes to existing PR storage, run schema, or History page.
- No changes to other routes.
- No new dependencies.

## Files

- new: `src/lib/performance-prediction.ts`
- new: `src/lib/prediction-history.ts`
- new: `src/components/PerformancePredictionCard.tsx`
- edit: `src/routes/coach.tsx` (mount the new card)
- edit: `src/components/CoachCard.tsx` (render the trend insight line)
- edit: `src/lib/coach-plan.ts` (add `predictionInsight` helper)
- edit: `src/lib/i18n.tsx` (new keys, EN + DA)
