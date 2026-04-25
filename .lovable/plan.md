## Goal

The run screen lets the user pick from 11 metrics (distance, duration, pace, avg pace, cadence, elevation, calories, stride, vertical oscillation, ground contact, sweat loss). After a run, only 5 of them survive on `/run/$id`. Make every metric visible and analyzable on the post-run history detail page.

## Scope

Edit only `src/routes/run.$id.tsx` (plus a couple of i18n keys if missing). No data-model changes are needed — every metric is either already stored on `Run` or can be derived from `run.points` / aggregates.

The history *list* (`/history`) stays as-is (compact cards). All-metrics view lives on the run detail page where there's room to analyze.

## What gets added to `/run/$id`

Below the existing 2×2 stat grid, add a new "All metrics" section rendered as a 2-column grid of `StatTile`s. It shows every metric in the same order as `ALL_METRIC_IDS`, with values computed from the saved run:

| Metric | Source |
|---|---|
| Distance, Duration, Avg pace, Cadence, Elevation | already on `Run` (keep current hero + 2×2) |
| Pace (current) | omitted — meaningless after the run; replaced with **Best pace (fastest km)** derived via `bestTimeForPoints(run.points, 1000)` |
| Calories | reuse `estimate*` from `stat-metrics.ts` by feeding a synthetic `LiveStats` snapshot built from the run aggregates |
| Stride length | same approach (uses avg pace + avg cadence) |
| Vertical oscillation | same |
| Ground contact | same |
| Sweat loss | same |

To keep the formulas in one place, export a small helper `computeRunMetrics(run)` from `src/lib/stat-metrics.ts` that returns a `LiveStats`-shaped object built from a saved `Run` (`distanceM`, `durationMs`, avg pace as both `currentPaceSecPerKm` and `avgPaceSecPerKm`, `avgCadenceSpm`, `elevationGainM`). The detail page then loops `ALL_METRIC_IDS` and calls `METRICS[id].format(snapshot)` for each — no formula duplication.

The existing 2×2 `StatTile` block stays as the "primary" view; the new section is titled "All metrics" / "Alle målinger" and includes a small "Fastest km" tile alongside.

## Layout sketch

```text
[ Map ]
[ Weather row ]
[ Shoe row ]
[ Hero distance ]
[ Duration | Avg pace ]      ← existing
[ Cadence  | Elevation ]     ← existing
[ All metrics ── 2-col grid ]
  Calories | Fastest km
  Stride   | Vert. osc.
  Ground contact | Sweat loss
[ Splits chart ]             ← unchanged
```

## i18n

Reuse existing keys (`stat.calories`, `stat.stride`, `stat.vertOsc`, `stat.groundContact`, `stat.sweatLoss`, `unit.kcal`, `unit.cm`, `unit.ms`, `unit.l`). Add two new keys if missing:
- `run.allMetrics` → "All metrics" / "Alle målinger"
- `stat.fastestKm` → "Fastest km" / "Hurtigste km" (verify; if absent, add to both `en` and `da`)

## Files touched

- `src/lib/stat-metrics.ts` — add and export `computeRunMetrics(run: Run): LiveStats`.
- `src/routes/run.$id.tsx` — add the "All metrics" section + fastest-km tile.
- `src/lib/i18n.tsx` — add any missing label keys listed above.

No changes to storage, routing, or the live tracker.