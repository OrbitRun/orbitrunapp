## Personal Records (PR) Engine & UI

Add automatic PR tracking that runs whenever a run is saved, a dedicated PR page reachable from the bottom nav, and a discreet "New Personal Record" notification before the user lands in history.

### 1. PR engine — `src/lib/personal-records.ts` (new)

Categories tracked:
- **Time PRs** for fixed distances: 1 km, 5 km, 10 km, Half marathon (21.0975 km), Marathon (42.195 km) — best time to cover at least that distance.
- **Longest run** — max `distanceM`.
- **Fastest avg pace over 1 km** — best single km split (`paceSecPerKm`) from any run's splits.

Data shape stored in `localStorage` under `lux-runner:prs:v1`:
```ts
type PrCategory = "1k" | "5k" | "10k" | "half" | "marathon" | "longest" | "fastestKm";
type PrEntry = { category: PrCategory; value: number; runId: string; achievedAt: number };
type PrMap = Partial<Record<PrCategory, PrEntry>>;
```

Functions:
- `loadPrs(): PrMap`
- `computeRunPrs(run): { category, value }[]` — derives candidate values from a single run (interpolating along the route for fixed distances using cumulative `distanceM` between points + their timestamps; falls back to `splits` for `fastestKm`).
- `checkAndUpdatePrs(run): PrCategory[]` — compares against stored PRs, writes new bests, returns categories that improved.
- `recomputeAllPrs()` — rebuilds the PR map from `loadRuns()` (used once on first read to backfill existing history; gated by a `lux-runner:prs:built:v1` flag).

For 1k/5k/10k/half/marathon: walk the run's `points` accumulating distance; for each point compute "earliest time at which the runner had covered ≥ Xm by sliding-window subtraction" — track the best (smallest duration) window. Skip if the run is shorter than the target.

For lower comparison semantics: time-based PRs use `min`, distance PR uses `max`, fastestKm uses `min`.

### 2. Hook into save flow — `src/hooks/use-run-tracker.ts`

In `commitRun`, after `saveRun(run)`:
```ts
const newPrs = checkAndUpdatePrs(run);
if (newPrs.length > 0) {
  window.dispatchEvent(new CustomEvent("orbit:new-pr", { detail: { runId: run.id, categories: newPrs } }));
}
```
Existing voice cue + state reset stay unchanged.

### 3. Achievement popup — `src/components/PrAchievement.tsx` (new)

A global listener mounted in `src/routes/__root.tsx` that listens for `orbit:new-pr` and renders a centered modal-style card for ~4 seconds (auto-dismiss, tap to close):

- Backdrop: `bg-background/80` (no blur, flat).
- Card: `glass-strong rounded-3xl px-6 py-5`, white title, neon-green PR list (no glow), small footer "Tap to continue".
- Title: "New Personal Record!" / "Ny personlig rekord!" (DA).
- Body: list each improved category with its label and new value (e.g. "5 km — 22:45", "Longest run — 12.4 km").
- Uses `animate-scale-in` for entrance.

### 4. PR page — `src/routes/records.tsx` (new)

Route: `/records`. Layout follows the minimalist high-end spec:

- Header: eyebrow "Milestones" / "Milepæle", h1 "Personal Records" / "Personlige rekorder".
- Vertical list, generous spacing (`space-y-3`).
- Each card: `glass rounded-2xl px-4 py-4 flex items-center justify-between` — left: distance label in bold display font; right: time/value in `text-neon` (no `shadow-neon`, no glow). Bottom row inside card: small muted date "Sat 12. apr. 2024" / "Sat 12. April 2024", localized via `lang`.
- Empty state per row: muted gray "—" with subtitle "Endnu ikke gennemført" / "Not completed yet".
- Order: 1 km, 5 km, 10 km, Half marathon, Marathon, Longest run, Fastest km.

Uses `useSwipeNav` consistent with other routes.

### 5. Bottom nav — `src/components/BottomNav.tsx`

Add a fourth item between History and Profile:
- Icon: `Trophy` (lucide).
- Label key: `nav.records`.
- Route: `/records`.

Grid still works with `flex justify-around`; spacing remains balanced.

### 6. i18n additions — `src/lib/i18n.tsx`

Add to both `en` and `da`:
- `nav.records`: "Records" / "Rekorder"
- `pr.eyebrow`: "Milestones" / "Milepæle"
- `pr.title`: "Personal Records" / "Personlige rekorder"
- `pr.notDone`: "Not completed yet" / "Endnu ikke gennemført"
- `pr.newPr`: "New Personal Record!" / "Ny personlig rekord!"
- `pr.tapContinue`: "Tap to continue" / "Tryk for at fortsætte"
- `pr.cat.1k`, `pr.cat.5k`, `pr.cat.10k`, `pr.cat.half`, `pr.cat.marathon`: "1 km", "5 km", "10 km", "Half marathon"/"Halvmarathon", "Marathon"
- `pr.cat.longest`: "Longest run" / "Længste løbetur"
- `pr.cat.fastestKm`: "Fastest km" / "Hurtigste km"
- `pr.dateSet`: "Set {date}" / "Sat {date}"

### 7. Update swipe-nav chains

Adjust `useSwipeNav` calls in `index.tsx`, `history.tsx`, `profile.tsx` so swipe order becomes Run → History → Records → Profile.

### Files

**New:**
- `src/lib/personal-records.ts`
- `src/components/PrAchievement.tsx`
- `src/routes/records.tsx`

**Edited:**
- `src/hooks/use-run-tracker.ts` (dispatch PR event after save)
- `src/routes/__root.tsx` (mount `<PrAchievement />`)
- `src/components/BottomNav.tsx` (add Records tab)
- `src/lib/i18n.tsx` (new keys, EN + DA)
- `src/routes/index.tsx`, `src/routes/history.tsx`, `src/routes/profile.tsx` (swipe-nav order)

### Notes

- All PR data is derived from existing `Run` records in `localStorage`; no schema migration needed. On first load of `/records` after deploy, `recomputeAllPrs()` backfills from history.
- The popup uses flat styling (no `shadow-neon`, no `drop-shadow`) consistent with the recent countdown overlay refactor.
- Time formatting reuses `formatDuration`, distance uses `formatDistance`, pace uses `formatPace`.
