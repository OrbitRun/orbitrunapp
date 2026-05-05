## Goal
Add a complete, adaptive "Mit Træningsforløb" section to `/coach` that visualizes the full multi‑week plan, expands per week, marks completed/skipped/AI‑adjusted sessions, and regenerates when the user edits goal, target date, or ambition.

## New / changed files

**New**
- `src/lib/training-plan.ts` — generates and adapts the full plan
- `src/components/TrainingTimeline.tsx` — the main "Mit Træningsforløb" UI
- `src/components/GoalEditorSheet.tsx` — modal to edit distance / target date / ambition

**Changed**
- `src/lib/user-profile.ts` — extend `CoachConfig` with `targetDate?: string` (ISO) and `ambition?: "finish" | "pr" | "elite"`. Migration: existing configs default to `ambition: "finish"`, no target date.
- `src/components/CoachOnboarding.tsx` — add 2 optional steps (target date, ambition) at the end; persist into `CoachConfig`.
- `src/routes/coach.tsx` — render `<TrainingTimeline />` below `<WeeklyTrimpBreakdown />`.
- `src/lib/i18n.tsx` — add EN/DA strings for the new section, week phases, ambition, status labels, goal editor.

## Plan generation (`src/lib/training-plan.ts`)

Build on top of the existing `getCoachPlan` (totalWeeks, weeklySessions, milestones with phases base/build/peak/taper).

Types:
```ts
type SessionType = "easy" | "long" | "tempo" | "intervals" | "walkRun" | "rest";
type SessionStatus = "upcoming" | "done" | "skipped" | "adjusted";
type PlannedSession = {
  id: string;            // `${weekIndex}-${dayIndex}`
  weekIndex: number;     // 1-based
  dayIndex: number;      // 0=Mon..6=Sun
  date: number;          // ms
  type: SessionType;
  title: string;
  distanceKm: number;
  status: SessionStatus;
  matchedRunId?: string;
  adjustedReason?: string; // i18n key
};
type PlannedWeek = {
  weekIndex: number;
  phase: "base"|"build"|"peak"|"taper";
  focusKey: string;        // i18n
  totalKm: number;
  sessions: PlannedSession[];
  isCurrent: boolean;
  isPast: boolean;
  isEstimated: boolean;    // future weeks
};
```

Generation rules:
- Base weekly km derived from `coach.level` (2/4/7/12) and ambition multiplier (`finish ×1.0`, `pr ×1.2`, `elite ×1.5`).
- Per phase: base = mostly easy + 1 long; build = +1 tempo; peak = +intervals + long; taper = volume cut 40%.
- Sessions placed on canonical days based on `weeklySessions` (e.g. 3/wk → Mon/Wed/Sat; 5/wk → Mon/Tue/Thu/Fri/Sun).
- Week dates anchored at `coach.configuredAt` (week 1 = configured week). If `targetDate` set, recompute `totalWeeks` to fit (clamped 4..24).

Adaptive layer (computed at render time, not persisted):
- Match each past planned session to nearest run within ±2 days; mark `done` if distance ≥80% of plan, else `adjusted` with reason `plan.reason.short`. Unmatched past = `skipped`.
- Current week: read latest TRIMP (existing `computeTrimp`) + latest HRV (`useVitals`):
  - 7d TRIMP > 1.4 × prior 7d, or HRV drop >15% → swap remaining hard sessions to easy and mark `adjusted` with `plan.reason.highLoad` / `plan.reason.lowHrv`.
- Future weeks: compare actual avg pace/distance over last 14d vs plan; if user is consistently >10% faster/longer, scale future weeks +1 ambition tier worth of volume; if behind, scale down. Marked as "Estimated" badge.

Progress helper returns `{ weekIndex, totalWeeks, pct }` (overall pct = done sessions / total).

## TrainingTimeline component

Layout (matches existing glass cards on `/coach`):
- Header: eyebrow `MIT TRÆNINGSFORLØB`, title `Uge X af Y`, right-aligned `NN%`.
- Progress bar (same `bg-neon` style as `CoachCard`).
- "Rediger mål" pill button → opens `GoalEditorSheet`.
- Radix Accordion (`@/components/ui/accordion`, already in project) with one item per week.
  - Trigger row: `Uge N` · phase chip (color per phase) · `XX km` · status dot.
  - Current week auto-expanded (`defaultValue`). Estimated badge for future weeks.
  - Content: list of sessions with day name, title, km, and status icon:
    - `done` → CheckCircle2 (neon)
    - `skipped` → XCircle (muted)
    - `adjusted` → Sparkles (amber) with tooltip text from `adjustedReason`
    - `upcoming` → Circle outline
- Visual link to TRIMP graph: reuse the same `bg-neon/60` bars in the per-week summary, so a heavy week visually mirrors `WeeklyTrimpBreakdown`.

## GoalEditorSheet
Radix Dialog with three controls:
1. Distance — buttons (5 km, 10 km, Halvmaraton, Maraton) → maps to `CoachGoal`.
2. Måldato — `<input type="date">` (no extra deps), min = today+14d.
3. Ambition — segmented control: `Gennemfør | PR | Elite`.

On Save: update `profile.coach` via `saveProfile`, reset `configuredAt = Date.now()` only if distance changed, dispatch `orbit:profile-update`. Timeline re-derives immediately.

## Adaptive triggers / refresh
TrainingTimeline subscribes to:
- `orbit:profile-update`
- `orbit:run-updated`, `orbit:run-stop`
…and recomputes the plan via `useMemo`.

## Out of scope
- No backend; everything client-side using existing localStorage profile + runs.
- No LLM call; "AI adjustments" use deterministic rules described above (the existing app already labels deterministic logic as "AI" in `coach.zone5Override`).
- No new dependencies — uses Radix Accordion/Dialog already present in `src/components/ui/`.
