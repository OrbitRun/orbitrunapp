## Pace Heatmap + Rewind Replay (Run Detail)

Add two features to the post-run view at `/run/$id`:

1. **Pace heatmap** — color the route polyline by instantaneous pace (green = fast, yellow = mid, red = slow).
2. **Rewind replay** — a scrubber + play/pause control to step through the run timeline, showing a moving marker on the map and live pace / speed / elevation / distance / clock at that timestamp.

### Where it lives

- `src/routes/run.$id.tsx` — mount a new `<RunReplay run={run} />` block directly under the existing map section. The current static `<RunMap>` becomes part of `RunReplay` (replay map replaces it), so the page keeps one map, not two.

### New / changed files

- **NEW** `src/lib/run-replay.ts` — pure helpers:
  - `buildReplaySeries(run)` → array of `{ ms, distM, lat, lng, alt, paceSecPerKm, speedMps }`. Walks `run.points`, computes cumulative distance (haversine), instantaneous pace using a ~10s rolling window (same approach as `hr-graph.ts`), smooths elevation with EMA.
  - `paceColorForSecPerKm(pace, minPace, maxPace)` → returns an oklch color interpolated across a fixed neon → amber → red ramp using percentile clamps (5th/95th) so a single slow km doesn't wash out the gradient.
  - `sampleAtMs(series, ms)` → linear interpolation of position + metrics for the scrubber.

- **NEW** `src/components/RunReplay.tsx`:
  - Renders a Mapbox map identical to `RunMap` but draws the route as **multiple short LineString features**, each colored by the segment's pace using `["get", "color"]` data-driven paint. (Mapbox `line-color` with per-feature properties — no glow, keeps the existing 1px black border layer underneath.)
  - Below the map: a horizontal slider (`<input type="range">` styled with neon track) bound to elapsed-ms, plus a Play/Pause button. Playback advances `requestAnimationFrame` at configurable speed (1×, 2×, 4×, 8× — small chips).
  - Live readout row (4 tiles, reusing `StatTile` styling): **Time**, **Distance**, **Pace**, **Elevation**. Speed shown as a secondary line under Pace.
  - Animated marker = bold neon dot (same look as the head marker in `RunMap`) at the interpolated coordinate.
  - A small legend strip under the map: gradient bar with min/median/max pace labels.

- **CHANGED** `src/routes/run.$id.tsx`:
  - Replace the existing `<RunMap points={run.points} ... highlight={scrubLatLng} />` section with `<RunReplay run={run} />`. Drop the now-unused `scrubLatLng` state if no other consumer needs it (HR analytics card already manages its own highlight).

- **CHANGED** `src/lib/i18n.tsx`:
  - Add keys: `replay.title`, `replay.play`, `replay.pause`, `replay.speed`, `replay.legend.fast`, `replay.legend.slow`, `replay.elevation`, `replay.speed.label` (Danish + English).

### Technical details

- **Heatmap segmentation**: split the route into one feature per consecutive GPS pair (or per ~50m chunk to keep feature count low on long runs). Each feature's `properties.color` is set from `paceColorForSecPerKm`. Use a single GeoJSON source + one `line` layer with `"line-color": ["get", "color"]`. Keep the existing black border layer for contrast.
- **Color ramp**: oklch stops at `oklch(0.92 0.21 130)` (neon green, fast) → `oklch(0.85 0.17 85)` (amber, mid) → `oklch(0.65 0.22 25)` (red, slow). Tokens-only — no raw hex.
- **Pace window**: 10s rolling. For very short runs (<30s) fall back to per-segment instantaneous speed.
- **Scrubber playback**: `requestAnimationFrame` loop multiplies real elapsed by current speed factor; pauses on tab blur to avoid drift.
- **Elevation**: use existing `point.alt` (already collected by `use-run-tracker`), apply same EMA smoothing already used during recording so the readout matches `run.elevationGainM` philosophy.
- **No backend changes** — everything is derived from the existing `Run.points` already stored in localStorage.
- **Performance**: memoize `buildReplaySeries(run)` keyed by `run.id`. Long runs (>2000 points) are downsampled to ~1500 segments for the map source; the scrubber still interpolates against the full series.

### Out of scope

- No new GPS collection, no schema changes, no edits to `use-run-tracker`.
- HR overlay on the replay timeline — `HrAnalyticsCard` already handles HR scrubbing separately and stays as-is.
