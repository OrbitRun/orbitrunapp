## Goal

Add an **Orbit Coach** intelligence layer: extended profile data (running level, weekly frequency, primary goal) collected through a dedicated coach onboarding flow, a coach card on the home screen showing the next task, and a post-run **RPE (perceived exertion)** prompt that saves a 1–10 score with each run.

All UI stays minimalist: dark background, white text, large thumb-friendly buttons, no glow effects.

## What the user will see

1. **Home screen** gets a new **"Orbit Coach"** card under the header.
   - Not configured yet → "Klik her for at lade Orbit planlægge din træning". Tapping opens the Coach Setup flow.
   - Configured → "Næste opgave: <dynamic suggestion>" (e.g. "30 min rolig tur" or "Intervaller: 5×800m"). Tapping opens the Coach Setup flow to re-edit answers.

2. **Coach Setup flow** (`CoachOnboarding` modal, same visual style as existing `Onboarding.tsx`, 3 steps + finish):
   - Step 1 — *Niveau*: 0–2 km / 3–5 km / 5–10 km / 10+ km
   - Step 2 — *Frekvens*: 1–2 / 3–4 / 5+ dage pr uge
   - Step 3 — *Mål*: Vægttab / 5 km / Hurtigere 10 km / Halvmarathon / Marathon
   - Also reachable from Profile via a new "Konfigurer Coach" row.

3. **Post-run RPE prompt**: when a run is saved (after the `RunSummary` "Save" tap), a small overlay asks **"Hvor hårdt føltes turen?"** with a horizontal 1–10 scale (10 large square buttons, label "Meget let" under 1 and "Maksimal indsats" under 10, plus a Skip option). The selected score is persisted on the run.

4. **History / run detail**: RPE shows as a subtle "RPE 7/10" chip when present (no layout overhaul).

## Technical implementation

### Data model

`src/lib/user-profile.ts` — extend `UserProfile`:
```ts
export type CoachLevel = "0-2" | "3-5" | "5-10" | "10+";
export type CoachFrequency = "1-2" | "3-4" | "5+";
export type CoachGoal = "weightLoss" | "finish5k" | "faster10k" | "halfMarathon" | "marathon";

coach?: {
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
  configuredAt: number;
};
```
- Defaults: `coach: undefined`. Add to `DEFAULT_PROFILE`.
- Add helper `nextCoachTask(profile, lang): string` that maps `(level, frequency, goal)` → a short Danish/English task string (deterministic switch, no AI call).

`src/lib/run-types.ts` — extend `Run`:
```ts
rpe?: number; // 1..10
```
- `loadRuns` migration: untouched runs simply have `rpe` undefined.

### New files

- `src/components/CoachOnboarding.tsx` — modal mirroring `Onboarding.tsx` styling (3 stepper dots, large pill buttons, Tilbage/Næste/Færdig). Saves via `saveProfile({ ...profile, coach: {...} })`.
- `src/components/RpePrompt.tsx` — full-screen overlay with title, 10 large numeric buttons in a 5×2 grid (wraps nicely at 339px viewport), end-labels, and Spring over button. Calls `onSubmit(score)` / `onSkip()`.
- `src/components/CoachCard.tsx` — the Orbit Coach card for the home screen; reads profile, renders the two states, opens `CoachOnboarding` on tap.

### Wiring

- `src/routes/index.tsx`:
  - Render `<CoachCard />` directly under the header (above the ghost-active banner) and only when `t.status === "idle" || "finished"` so it does not crowd active-run UI.
  - In `handleSave`, after `t.commitRun(pendingRun)`, set local state `awaitingRpeRunId = pendingRun.id` and render `<RpePrompt>`. On submit/skip, call `updateRun(id, { rpe })` (skip just clears the prompt).

- `src/routes/profile.tsx`: add a "Konfigurer Coach" row (icon + label + chevron) opening `CoachOnboarding`. Show current answers as subtitle when configured.

- `src/routes/history.tsx` and `src/routes/run.$id.tsx`: if `run.rpe` is set, render a small `RPE 7/10` chip in the existing stat row (no layout rework).

### i18n

Add Danish + English keys to `src/lib/i18n.tsx`:
- `coach.title`, `coach.cta.unset`, `coach.cta.next`, `coach.configure`
- `coach.q.level`, `coach.q.frequency`, `coach.q.goal` and option labels
- `rpe.title`, `rpe.veryEasy`, `rpe.maxEffort`, `rpe.skip`

### Design rules followed

- Dark `bg-background`, white text, `border border-white/10`, no `shadow-neon` / glow on the new components.
- Buttons use existing pill / rounded-2xl patterns from `Onboarding.tsx` for consistency.
- All tap targets ≥ 44px.

## Out of scope

- No backend / Lovable Cloud — everything stays in `localStorage` like the rest of the profile and runs.
- No AI Coach voice line changes (existing ghost coach lines remain).
- No history-card layout overhaul; RPE chip is additive only.
