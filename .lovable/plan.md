## Goal
Add a year filter to the History page so users can scope runs, totals, and records to a specific year or All Time, mirroring the look/feel of the existing records carousel.

## Changes

### 1. New component: `src/components/YearFilterCarousel.tsx`
- Horizontal Embla carousel (same setup as `RecordsCarousel`: `useEmblaCarousel({ align: "start", dragFree: true, loop: false })`).
- Pills: `All Time`, then each year present in the user's runs (descending, derived from `loadRuns()` via `new Date(run.startedAt).getFullYear()`).
- Active pill: bold neon text + 2px neon underline bar; inactive: muted text. Minimal, no glass cards — just text pills with the underline marker, matching the app's quiet uppercase eyebrow style.
- Props: `selectedYear: number | "all"`, `years: number[]`, `onChange(year)`.
- Swipeable when overflowing; no dot indicators (years are self-labeling).

### 2. `src/routes/history.tsx`
- Add state `selectedYear: number | "all"` (default `"all"`).
- Compute `years` from `runs` (memoized, sorted desc).
- Compute `filteredRuns` = `runs` filtered by year (memoized).
- Use `filteredRuns` for: totals strip (runs / distance / time), the runs `<ul>`, `WeeklyTrimpBreakdown`, and `prsByRun` (recomputed from filtered records — see #3).
- Place `<YearFilterCarousel />` directly above `<RecordsCarousel />` per the spec ("over listen med løb", and stats should follow the selection too — placing it at the very top makes the scope global to the page).
- Keep transitions snappy: pure client-side filtering, no async.

### 3. `src/components/RecordsCarousel.tsx`
- Accept new optional prop `year?: number | "all"` (default `"all"`).
- When a year is selected, compute PRs from runs filtered to that year using a new helper `computePrsForRuns(runs)` (extracted from existing `recomputeAllPrs` logic in `src/lib/personal-records.ts`) instead of `loadPrs()`.
- Update eyebrow label: `"All-Time Records"` vs `"YYYY Records"`.
- VO2 best card: also scope `bestVo2MaxFromRuns` to the filtered runs.
- When `year === "all"`, behavior is unchanged (still uses stored PRs).

### 4. `src/lib/personal-records.ts`
- Export a pure helper `computePrsForRuns(runs: Run[]): PrMap` (refactor from the loop already inside `recomputeAllPrs`); `recomputeAllPrs` calls it with `loadRuns()` then persists.
- No storage/schema changes — yearly PRs are always derived on the fly.

### 5. i18n keys (`src/lib/i18n.tsx`)
- `history.allTime` ("All Time" / "Hele tiden")
- `records.carousel.eyebrow.year` ("{{year}} Records" / "{{year}} rekorder")
- `records.carousel.eyebrow.all` (reuse existing if present, else "All-Time Records")

## Out of Scope
- No persistence of selected year (resets to All Time on remount — matches "fast and fluid").
- No changes to underlying run data, storage, or PR write logic.
- No changes to the run detail page or other routes.

## Technical Notes
- All filtering is in-memory; runs already live in `localStorage`. No backend work.
- Year list is dynamic: only years where the user has at least one run appear.
- `useMemo` on `filteredRuns`, `years`, and yearly PR map to avoid recomputation on unrelated re-renders.
