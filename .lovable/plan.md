# 4-tab navigation restructure

Goal: keep current visuals intact, just reorganize where things live.

## New tabs (BottomNav)

`src/components/BottomNav.tsx` — replace the Records item with Coach. Order: **Run · Coach · History · Profile**.

| Tab | Path | Icon |
|-----|------|------|
| Run (Løb) | `/` | Activity |
| Coach | `/coach` | Sparkles |
| History (Historik) | `/history` | History |
| Profile | `/profile` | User |

Add i18n key `nav.coach` ("Coach" / "Coach").

## Tab 1 — Run (`src/routes/index.tsx`)

Keep map, stats, Spotify/MusicHub, start button exactly as today. Changes:

- Remove `<ReadinessPanel />` and `<CoachCard …/>` from this route.
- Insert a slim "Dagens status" strip immediately under the header that links to `/coach`. New component `DailyStatusStrip`:
  - Computes the readiness score via existing `computeReadiness({ runs, vitals, hrZones, env })` (same hooks already used by ReadinessPanel).
  - Renders one line: small dot in band color + `score/100` + band label + recommendation (truncated) + chevron.
  - Wrapped in `<Link to="/coach">`, same `glass` rounded styling for visual consistency.
- Keep `RecoverRunBanner` and ghost banner where they are.

## Tab 2 — Coach (new `src/routes/coach.tsx`)

A dedicated page that hosts the deep coaching experience. Layout (top-down):

1. Page header: eyebrow `coach.eyebrow`, title `coach.title`.
2. `<ReadinessPanel />` (already deep — score, HR/HRV/TRIMP/weather mini-stats, CTAs).
3. `<CoachCard profile={profile} />` (existing card with next session, plan progress, zone-5 override).
4. `<WeeklyTrimpBreakdown runs={runs} />` reused for in-context training-load analysis.

No design changes to those components — pure relocation/composition. Profile loaded via `useUserProfile()`; runs via `loadRuns()` + the same `orbit:run-updated` listener pattern used elsewhere.

## Tab 3 — History (`src/routes/history.tsx`)

Keep the existing list + WeeklyTrimpBreakdown unchanged. Add a **swipeable Records carousel** at the top (above the 3-stat summary):

- New component `src/components/RecordsCarousel.tsx` using the existing `embla-carousel-react` (already in `src/components/ui/carousel.tsx`).
- Each slide reuses the visual treatment from `src/routes/records.tsx`: `glass rounded-2xl px-4 py-4`, category title, large neon mono value, date-set line, and the "Race ghost" button (same handler — `selectGhost(run, …); navigate({ to: "/" })`).
- Iterates `PR_ORDER` from `personal-records`, calls `recomputeAllPrs()` on mount, listens for `orbit:new-pr`.
- One PR per slide, snap-scroll, dot indicators below; no nav arrows on mobile.

## Tab 4 — Profile

No changes.

## Removals

- Delete `src/routes/records.tsx` (content fully migrated to the carousel).
- Routes regenerate automatically; do not hand-edit `routeTree.gen.ts`.
- Remove any in-app `<Link to="/records">` references (BottomNav is the only one expected; verify with `rg "/records"`).

## i18n additions (`src/lib/i18n.tsx`)

- `nav.coach` — Coach / Coach
- `coach.eyebrow` — Your Coach / Din coach
- `coach.title` — AI Coach / AI-coach
- `dailyStatus.eyebrow` — Today's status / Dagens status
- `dailyStatus.cta` — Open coach / Åbn coach
- `records.carousel.eyebrow` — Personal records / Personlige rekorder

## File summary

Create:
- `src/routes/coach.tsx`
- `src/components/DailyStatusStrip.tsx`
- `src/components/RecordsCarousel.tsx`

Edit:
- `src/components/BottomNav.tsx` (swap Records → Coach)
- `src/routes/index.tsx` (remove ReadinessPanel + CoachCard, insert DailyStatusStrip)
- `src/routes/history.tsx` (mount RecordsCarousel above stats)
- `src/lib/i18n.tsx` (new keys)

Delete:
- `src/routes/records.tsx`

No data model, storage, or backend changes.
