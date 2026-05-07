## Make post-run map route a pace heatmap

The pace-heatmap pipeline already exists in `src/lib/run-replay.ts` (`buildReplaySeries` produces colored segments) and is used by `RunReplay`. The plain post-run map (`RunMap`) currently renders a single solid line — and because it tries to feed an `oklch(...)` string straight into Mapbox's `line-color`, Mapbox rejects it and falls back to black, which matches the symptom the user is seeing.

### Changes

**`src/components/RunMap.tsx`** — add an opt-in heatmap rendering mode:
- New optional prop `heatmap?: boolean` (default `false`, keep current behaviour for live tracking).
- When `heatmap` is true:
  - Compute segments via `buildReplaySeries({ ...run-shaped object })` — but `RunMap` only receives `points`. Instead, replicate just the segment-coloring step by importing a small helper. Simplest: export a new helper `buildPaceSegmentsFromPoints(points: GeoPoint[])` from `src/lib/run-replay.ts` that wraps the existing internal logic (reuses `buildReplaySeries` with a synthetic minimal `Run`) and returns `{ segments }`.
  - Replace the single `LineString` feature with one feature per segment, each carrying a `color` property.
  - Switch `run-line-main`'s `line-color` paint to a `["get", "color"]` data expression (same pattern `RunReplay` already uses).
  - Keep the dark border layer unchanged for contrast.
  - Add the same fast→slow gradient legend underneath the map (or expose a `showLegend` prop) — kept inside `RunMap` so all consumers get it for free when `heatmap` is on.
- When `heatmap` is false: behaviour and rendering are unchanged.

**`src/components/RunSummary.tsx`**
- Pass `heatmap` (and rely on the built-in legend) to the post-run `<RunMap>` at line 74.

**`src/routes/history.tsx`**
- Pass `heatmap` to the history-card `<RunMap>` so the saved-run thumbnails also use the heatmap. Legend can be suppressed for thumbnails via `showLegend={false}`.

### Out of scope
- `FocusRunView` and the index live-tracking map keep the solid neon line (heatmap needs a finished trace; live pace data is too noisy mid-run).
- `RunReplay` is unchanged — it already does this.
- No changes to color stops, smoothing, or `run-replay.ts` math; only a tiny exported wrapper.

### Technical notes
- Mapbox GL's `line-color` does not parse CSS `oklch(...)` strings. The existing `RunReplay` already converts oklch to RGB inside `run-replay.ts` (`mixOklch` produces the segment color string). The new helper will return those same already-resolved color strings, so feeding them to `["get", "color"]` works.
- Because heatmap segments are short straight lines between samples, we drop the Catmull-Rom spline only for the heatmap path; the underlying GPS samples still produce a visually smooth route at typical zoom levels. Smoothing remains for the non-heatmap path.
