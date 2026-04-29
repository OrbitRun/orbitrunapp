## Goal

Add a premium, interactive Heart Rate analytics block to both the **Post-Run Summary** and the **Run Detail** view. Replace nothing — slot the new block above `HrZoneBar` so the existing zone breakdown remains a complementary "time-in-zone" view.

## What the user will see

- A neon-green line chart of BPM over time (or distance), filling the card with a soft glow and a translucent gradient under the line
- 4 thin horizontal guide lines marking the boundaries of HR Zones 1–5, each labelled (Warm-up, Aerobic, Threshold, Anaerobic, Max)
- Drag a finger / cursor across the chart → a vertical scrubber line snaps to the nearest sample, showing exact BPM, time, distance and pace at that point
- The map above (in the run detail view) drops a pulsing neon dot at the matching geo-coordinate
- Below the chart, a 4-tile stat strip: **Max BPM**, **Avg BPM**, **VO2 Max Est.**, **Efficiency Factor (EF)**

When the run has no `hrSeries` data (older runs / no strap), the whole block renders an empty hint instead of breaking the layout.

## Files to add / change

**New**
- `src/lib/hr-graph.ts` — pure helpers: build `{ t, distM, bpm, pace }[]` series from `run.points` + `run.hrSeries`, find nearest sample by x-position, compute Efficiency Factor (EF = average speed in m/min ÷ avg HR), and zone-boundary lines from `DEFAULT_MAX_HR`.
- `src/components/HrAnalyticsCard.tsx` — the chart card. Recharts `<ComposedChart>` with `<Area>` (gradient fill, `stroke="none"`) + `<Line>` (neon stroke with SVG `feGaussianBlur` glow filter), `<ReferenceLine>` per zone boundary, custom `<Tooltip>`, and a controlled `activeIndex` driven by pointer/touch events. Emits `onScrub(point | null)` so the parent can move the map marker.

**Edit**
- `src/components/RunMap.tsx` — accept an optional `highlight?: { lat: number; lng: number } | null` prop and render a small pulsing neon Marker when set. Cleanly remove on null.
- `src/components/RunSummary.tsx` — render `<HrAnalyticsCard run={run} />` above `<HrZoneBar />`. (Map is non-interactive in summary, no marker sync needed here.)
- `src/routes/run.$id.tsx` — lift a `scrubLatLng` state, pass it as `highlight` to `<RunMap>`, render `<HrAnalyticsCard run={run} onScrub={(p) => setScrubLatLng(p?.coord ?? null)} />`.
- `src/styles.css` — add the `hr-glow` SVG filter as a tiny inline `<defs>` inside the chart component (kept local), plus a `@keyframes hr-marker-pulse` for the map marker.
- `src/lib/i18n.tsx` — add `hr.graph.title`, `hr.graph.empty`, `hr.stat.max`, `hr.stat.avg`, `hr.stat.vo2`, `hr.stat.ef`, `hr.zone.1`…`hr.zone.5` (English + Danish).

## Technical details

**Series building (`hr-graph.ts`)**
```ts
type GraphPoint = { t: number; ms: number; distM: number; bpm: number; paceSecPerKm: number | null; coord: { lat: number; lng: number } | null };
```
- Walk `run.hrSeries`. For each sample, find the nearest `GeoPoint` by timestamp (binary search) → derive `distM` (cumulative haversine over points up to that t) and instantaneous pace from a 10-sec rolling speed window.
- Cache the cumulative distance array once.

**Efficiency Factor**
- `EF = (avgSpeedMetersPerMinute) / avgHrBpm`, rounded to 2 decimals. Standard Daniels-style metric — higher = more aerobically efficient.
- Surfaced as plain number; `—` when avgHR or distance is missing.

**Chart styling**
- Stroke `var(--neon)` (resolves to `#deff9a`-ish neon-green token), width 2.5, `strokeLinecap="round"`, `filter="url(#hr-glow)"`.
- Area fill: `linearGradient` from `var(--neon)` at 35% opacity → 0% at the bottom.
- Reference lines: `strokeDasharray="2 4"` at 60/70/80/90 % of `DEFAULT_MAX_HR`, label aligned right with zone name in 9px uppercase muted text.
- Background: existing `glass` card. No axis ticks except 3 BPM grid values on the Y axis (resting / mid / max).

**Scrubber**
- Use Recharts `onMouseMove` / `onTouchMove` on the chart wrapper to set `activeIndex`. A `<ReferenceLine x={...}>` renders the vertical scrubber. Touch-friendly: pointer-events captured at the wrapper, throttled with `requestAnimationFrame`.
- `onScrub` callback fires with the active `GraphPoint` (or null on leave).

**Map marker**
- New Mapbox `Marker` with a 14×14 div: neon dot + outer halo using the new `hr-marker-pulse` keyframe (1.4s scale 1→2.2, opacity 0.6→0). Created on first highlight, position updated thereafter, removed on null.

**No new dependencies** — recharts and mapbox-gl are already installed.

## Out of scope

- Switching the X axis to distance instead of time (toggle could come later)
- Editing existing `HrZoneBar` (it stays — the graph is the primary view, the bar is the time-share view)
- Persisting EF as a stored field (computed on read; cheap)
