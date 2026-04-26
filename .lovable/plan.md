## Unified Coach & Progress UI

Merge `GoalProgress` into `CoachCard` so the dashboard shows one card for the Orbit Coach, with progress integrated. Clean up duplicate CTAs and ensure the header goal text matches the coach.

### 1. `src/routes/index.tsx`
- Remove `<GoalProgress profile={profile} />` (line 192) and its import.
- Tighten spacing: change `mt-1 mb-3` on the coach card section to `mt-2 mb-3` (already minimal — verify gap between header greeting and coach card is tight; remove `py-3` extra padding only if needed, keep header as is).
- Header goal sync (line 179): already uses `coachGoalLabel(profile.coach.goal, lang)` when coach exists — keep, but make sure `runFaster` resolves to the `fasterDistance` label (e.g. "Løb 10km hurtigere") rather than generic "Løb hurtigere". Update `coachGoalLabel` to accept the full `CoachConfig` (or pass `fasterDistance`) and return a distance-aware label.

### 2. `src/components/CoachCard.tsx`
**Configured state** — add a discrete progress strip at the bottom of the card:
- Import `getPlanProgress` from `@/lib/coach-plan`, `loadRuns` from `@/lib/run-types`, and listen to `orbit:run-updated` / `orbit:run-stop` to recompute.
- Below the existing "Detail" CTA button, render a thin progress section:
  - Small label row: `Uge {weekIndex} af {totalWeeks}` on the left, `{pct}%` on the right (text-[10px] uppercase tracking, muted/neon).
  - 1.5px tall progress bar: `bg-white/5` track, `bg-neon` fill (no glow).
  - Below the bar: `{sessionsDone} / {sessionsPlanned} pas` muted-foreground text.
- Keep the expandable session detail panel as-is.

**Unconfigured state** — single unified empty card:
- Replace the current header + "Konfigurer" button with one clean card:
  - Title: `Orbit Coach`
  - Body: `Konfigurer din coach for at starte din plan` (single i18n string — replace both existing "unset"/CTA copies with this one).
  - Single primary button: `Konfigurer Coach` opening `CoachOnboarding`.
- Remove the secondary "Klik her for at lade Orbit planlægge din træning" copy.

### 3. `src/lib/i18n.tsx`
- Add/update keys:
  - `coach.empty.body` → `Konfigurer din coach for at starte din plan` / English equivalent.
  - `coach.empty.cta` → `Konfigurer Coach` / `Set up coach`.
  - `coach.plan.weekOf` → `Uge {current} af {total}` / `Week {current} of {total}`.
  - `coach.plan.sessions` → `pas` / `sessions` (reuse existing `goal.plan.sessions` if present).
- Remove or stop using the redundant longer "Klik her for at lade Orbit planlægge…" string from coach card paths (leave it in i18n if used elsewhere).

### 4. `src/lib/user-profile.ts`
- Update `coachGoalLabel` signature to optionally accept `fasterDistance` (or change call sites to pass the whole `CoachConfig`) so `runFaster` renders as `Løb 10km hurtigere` etc., matching the goal selected in onboarding.

### 5. Cleanup
- Delete `src/components/GoalProgress.tsx` (no longer referenced).
- Verify `profile.tsx` still uses only the single "Orbit Coach indstillinger" entry (no changes expected).

### Outcome
- One Orbit Coach card on the homepage, in both configured and unconfigured states.
- Configured: today's task + thin "Uge X af Y" progress bar inside the same card.
- Unconfigured: single message + single "Konfigurer Coach" button.
- Header greeting goal always matches the coach goal (including faster-distance variant).
