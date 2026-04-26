## Coach-First Architecture

Make the Orbit Coach the single source of truth for the user's goal. The dashboard's "Målfremgang" (GoalProgress) becomes a coach-driven plan tracker, redundant goal pickers are removed, and the visuals follow the existing minimalist dark style (no extra glow).

### 1. Goal override (Coach → Profile)

In `src/lib/user-profile.ts`:
- After `saveProfile`, when `coach` is set/updated, derive and overwrite `profile.goal` from `coach.goal` (and `coach.fasterDistance` when goal is "runFaster"). Mapping:
  - `finish5k` → `run5k`
  - `finish10k` → `run10k`
  - `halfMarathon` → `halfMarathon`
  - `marathon` → `marathon`
  - `weightLoss` → `weightLoss`
  - `runFaster` → distance from `fasterDistance` (`5k`→`run5k`, `10k`→`run10k`, `halfMarathon`, `marathon`); progress card still shows "Run faster" framing via a new flag.
- Add a small helper `coachToRunningGoal(coach)` and call it from `CoachOnboarding.finish()` so saving the coach automatically syncs `profile.goal`.

### 2. Plan-based progress tracking

Replace distance/pace heuristics in `GoalProgress` with a coach plan model:

- New module `src/lib/coach-plan.ts`:
  - `getCoachPlan(coach)` returns `{ totalWeeks, weeklySessions, milestones[] }` derived from `level`, `frequency`, `goal`, `fasterDistance`. Example: 8-week 5k beginner plan, 12-week half plan, etc.
  - `getPlanProgress(coach, runs)` returns `{ weekIndex, weekLabel (e.g. "Uge 2: Opbygning"), sessionsDone, sessionsPlanned, pct }`. `pct` = completed sessions since `coach.configuredAt` ÷ total planned sessions through the current week.
  - `currentMilestone(coach, runs)` returns the milestone label for the current week.

- `GoalProgress.tsx` (renamed conceptually to "Plan progress"):
  - Accept `coach` (optional) instead of just `goal`. If no coach, render a compact "Configure Orbit Coach" CTA that opens onboarding (no manual goal logic anymore).
  - Header eyebrow: current milestone (e.g. "Uge 2: Opbygning").
  - Progress bar fills based on completed plan sessions.
  - Body line: `sessionsDone / sessionsPlanned · weekLabel`.
  - "Suggest workout" button is replaced by "Dagens opgave" reusing `nextCoachSession` output.

### 3. Instant sync

- Already broadcast via `orbit:profile-update` on `saveProfile`. Add a `orbit:run-updated` listener (already dispatched after RPE submit and run save) inside `GoalProgress` so completing "Dagens Opgave" instantly recomputes plan progress.
- When `CoachOnboarding` saves a new `level` (or any field change), reset progress baseline by setting `coach.configuredAt = Date.now()`. `getPlanProgress` only counts runs with `endedAt >= configuredAt`.

### 4. UI cleanup

`src/routes/profile.tsx`:
- Remove the "Goal" section (lines 176–199) and the local `goals` array.
- Remove the `<GoalProgress goal={profile.goal} runs={runs} />` invocation here — it now lives only on the dashboard, fed by the coach.
- Replace with a single "Orbit Coach Indstillinger" button (using the existing coach row pattern) that opens `CoachOnboarding`. Keep the on/off toggle for `coachEnabled`.
- The header card subtitle stops showing `goalLabel(profile.goal)` and shows the coach's goal + level instead (or just experience level when no coach).

`src/routes/index.tsx`:
- Mount `<GoalProgress coach={profile.coach} runs={runs} />` (load runs via `loadRuns`) above or below `<CoachCard>` when `coachEnabled !== false`. Remove the greeting line that shows `goalLabel(profile.goal)`; show `coachGoalLabel(coach.goal)` when configured, otherwise prompt to set up the coach.

### 5. Visuals

- Keep current `glass` cards. Remove the `shadow-neon` and gradient fill on the progress bar; use a flat `bg-neon` fill on `bg-white/5` track for a high-contrast, no-glow look.
- Use the same row treatment as the rest of the profile settings list for the new "Orbit Coach Indstillinger" button (icon tile + label + chevron-style value).
- No new colors; reuse `text-neon`, `text-foreground`, `text-muted-foreground`.

### Files touched

- `src/lib/user-profile.ts` — add `coachToRunningGoal`, auto-sync goal in save flow.
- `src/lib/coach-plan.ts` — NEW: plan + milestone + progress derivation.
- `src/lib/i18n.tsx` — strings: `goal.plan.milestone`, `goal.plan.weekLabel`, `goal.plan.sessions`, `coach.settings`, `coach.settings.cta`, week names ("Uge X: Opbygning/Tempo/Peak/Taper").
- `src/components/GoalProgress.tsx` — rewrite around coach plan; drop manual heuristics; flat progress bar.
- `src/components/CoachOnboarding.tsx` — on save, also sync `profile.goal` and reset `configuredAt` when `level` changes.
- `src/routes/profile.tsx` — remove Goal section + GoalProgress; add "Orbit Coach Indstillinger" row; update card subtitle.
- `src/routes/index.tsx` — add GoalProgress under CoachCard, drop legacy goal greeting line.

### Out of scope

- No backend / Lovable Cloud changes — everything stays in `localStorage`.
- Old `RunningGoal` type stays (still used for `DISTANCE_TARGETS` mapping internally), but the user can no longer set it directly.
