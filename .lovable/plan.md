# Ghost Runner System

Race a previous run as a "ghost." User picks a ghost from History or PR page, the Start screen shows it's armed, and during the live run a GHOST metric, map marker, and AI Coach lines compare the user's progress against the ghost's time at the same distance.

## 1. Ghost data layer

**New file `src/lib/ghost-runner.ts`**
- `type GhostRef = { runId: string; label: string; cumulative: { d: number; t: number }[]; totalDistanceM: number; totalDurationMs: number }`
  - `cumulative` is precomputed at selection time from `run.points`: cumulative meters + cumulative elapsed ms (relative to run start), so live lookups are O(log n).
- `selectGhost(run, label)` → builds and stores a `GhostRef` in `localStorage` under `orbit:ghost:v1`; dispatches `orbit:ghost-changed`.
- `loadGhost()`, `clearGhost()`.
- `ghostTimeAtDistance(ghost, meters): number | null` — binary search + linear interpolation between adjacent cumulative samples. Returns `null` once `meters > totalDistanceM`.
- `ghostPositionAt(ghost, run, elapsedMs): { lat, lng } | null` — given the original run's points + an elapsed time, interpolate lat/lng along the path. Used by the map marker. Stored alongside the ghost as a slim `path: {lat, lng, t}[]` (relative `t` from start).

## 2. "Race This" entry points

**`src/routes/history.tsx`**
- Add a small ghost icon button (lucide `Ghost`) labeled `Udfordr` (DA) / `Race` (EN) in `ExpandableRunCard` header row, next to the chevron. On click: `selectGhost(run, formatDate(run.startedAt))` then `navigate({ to: "/" })`. `e.stopPropagation()` so it doesn't toggle expand.

**`src/routes/records.tsx`**
- For each PR card with an `entry`, add the same icon button. On tap: load the run via `loadRuns().find(r => r.id === entry.runId)`, call `selectGhost(run, t('pr.cat.'+cat))`, navigate to `/`.

**i18n keys to add** (`src/lib/i18n.tsx`):
- `ghost.race`: "Race" / "Udfordr"
- `ghost.active`: "Ghost active" / "Ghost aktiv"
- `ghost.clear`: "Clear" / "Ryd"
- `stat.ghost`: "Ghost" / "Ghost"
- `unit.ghostAhead` / `unit.ghostBehind` not needed — sign carries meaning.

## 3. Start screen indicator

**`src/routes/index.tsx`** — when status is `idle`/`finished` and `loadGhost()` returns non-null, render a small pill above the map:
```
[Ghost icon] Ghost active · {label}    [Clear ×]
```
Subscribe to `orbit:ghost-changed` to refresh. No glow — neutral border + small ghost icon.

## 4. Live ghost tracking

**`src/hooks/use-run-tracker.ts`**
- On `start()`, snapshot `loadGhost()` into `ghostRef.current`.
- Add `ghostDeltaMs: number | null` to `State` (positive = ahead of ghost, negative = behind, null = no ghost or past ghost finish).
- Inside `setState` after recomputing `newDist`: if `ghostRef.current`, compute `ghostT = ghostTimeAtDistance(ghost, newDist)`. Then `delta = ghostT == null ? null : ghostT - currentElapsedMs` (positive when ghost is slower than us at that distance → we're ahead).
- Currentelapsed comes from `prev.elapsedMs` (worker-tick accurate enough for the comparison).
- Track `ghostPassedRef` (boolean): toggled true the first tick `delta` crosses 0 from negative → positive. Triggers a one-shot speak: `"Du er lige gået forbi din ghost!"` / `"You just passed your ghost!"`.
- Periodic "behind by X" cue: every 60s while `delta < -10000`, speak `"Du er X sekunder bagud din ghost"`. Throttle via a `lastGhostCueAtRef`.

## 5. GHOST metric

**`src/lib/stat-metrics.ts`**
- Extend `MetricId` with `"ghost"`.
- Extend `LiveStats` with `ghostDeltaMs: number | null`.
- Add METRIC entry:
  ```ts
  ghost: {
    id: "ghost", labelKey: "stat.ghost",
    format: (s) => {
      if (s.ghostDeltaMs == null) return "—";
      const sign = s.ghostDeltaMs >= 0 ? "+" : "−";
      const abs = Math.abs(s.ghostDeltaMs);
      const m = Math.floor(abs / 60000);
      const sec = Math.floor((abs % 60000) / 1000).toString().padStart(2, "0");
      return `${sign}${m}:${sec}`;
    },
  }
  ```
- Add `"ghost"` to `ALL_METRIC_IDS` so it shows up in `MetricPicker`.
- `computeRunMetrics` returns `ghostDeltaMs: null`.

**`src/components/EditableStat.tsx`**
- When `metricId === "ghost"`, color value green if `stats.ghostDeltaMs >= 0`, red if `< 0`, muted if null. Strictly no glow ring (override `glow={false}` for this metric, never apply `glow-neon` class). Use Tailwind tokens `text-emerald-400` and `text-red-400`.

## 6. Map ghost marker

**`src/components/RunMap.tsx`**
- Add optional prop `ghost?: { path: {lat:number;lng:number;t:number}[]; elapsedMs: number } | null`.
- Inside the render effect, if `ghost` is provided and `elapsedMs <= last path t`, interpolate position along `ghost.path` (binary search by `t`). Render/update a second `Marker` with element style:
  ```
  width:14px;height:14px;border-radius:9999px;
  background:transparent;border:2px solid rgba(255,255,255,0.7);
  box-shadow:none;
  ```
- Hide marker (remove) when ghost finished or `ghost==null`.

**`src/routes/index.tsx`** — pass `ghost={t.ghost ? { path: t.ghost.path, elapsedMs: t.elapsedMs } : null}` to `<RunMap>`.

## 7. Minimalism / no-glow audit

- The new ghost pill, ghost map marker, and ghost stat tile all use plain border + neutral foreground; no `shadow-neon`, no `glow-neon`, no neon ring.
- Match existing tile padding/typography (`text-[10px] uppercase tracking-[0.2em]` labels, `font-display font-black tabular` values).

## Files to touch

| File | Change |
|---|---|
| `src/lib/ghost-runner.ts` | NEW — types, storage, distance/time/position helpers |
| `src/lib/stat-metrics.ts` | Add `ghost` metric, extend `LiveStats`, signed colored format |
| `src/components/EditableStat.tsx` | Green/red value when metric is `ghost`, suppress glow |
| `src/components/RunMap.tsx` | Optional ghost marker (white hollow circle) |
| `src/hooks/use-run-tracker.ts` | Snapshot ghost on start, compute `ghostDeltaMs` per tick, voice cues, expose `ghost` + `ghostDeltaMs` |
| `src/routes/index.tsx` | "Ghost active" pill + clear button; pass ghost to map; feed `ghostDeltaMs` into `LiveStats` |
| `src/routes/history.tsx` | "Race" icon button per run card |
| `src/routes/records.tsx` | "Race" icon button per PR row |
| `src/lib/i18n.tsx` | EN + DA keys: `ghost.race`, `ghost.active`, `ghost.clear`, `stat.ghost`, plus the two AI coach lines |

## Result

Tap `Udfordr` on a past run or PR → return to Start with a "Ghost active" pill → start running. The GHOST tile (selectable in the layout) shows live `+/-mm:ss` versus that ghost in green/red, a hollow white dot moves along the old route on the map, and the AI coach announces overtake / "behind by X seconds" moments.
