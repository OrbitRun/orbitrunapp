# Sync Onboarding → Coach + Expandable Session Details

Two issues to fix on the Coach page after onboarding:

1. **Coach is empty after onboarding** — the onboarding wizard saves `goal`, `level`, and `onboardingData`, but never creates a `CoachConfig`. So `CoachCard` shows the unconfigured empty state and `TrainingTimeline` is hidden (it returns `null` when `profile.coach` is missing).
2. **No way to read the full session description** — each day in the weekly accordion is a flat `<li>` showing only title + km. Users can't see the "how to" / pace guidance.

---

## 1. Auto-generate `CoachConfig` from onboarding answers

In `src/components/Onboarding.tsx`, in `finish()` (and the existing `persistAll`), build a `CoachConfig` from the collected answers and save it on the profile so the Coach page is immediately populated.

Mapping (deterministic, no new questions):

- **`goal` (CoachGoal)** ← from `RunningGoal`:
  `run5k → finish5k`, `run10k → finish10k`, `halfMarathon → halfMarathon`, `marathon → marathon`, `runFaster → runFaster` (default `fasterDistance: "5k"`), `weightLoss → weightLoss`.
- **`level` (CoachLevel)** ← from `onboardingData.weeklyKm`:
  `"0" → "0-2"`, `"0-10" → "3-5"`, `"10-25" → "5-10"`, `"25+" → "10+"`. Fallback: derive from `ExperienceLevel` (`beginner → "0-2"`, `expert → "5-10"`).
- **`frequency` (CoachFrequency)** ← from `preferredDays.length`:
  `≤2 → "1-2"`, `3–4 → "3-4"`, `≥5 → "5+"`.
- **`ambition` (CoachAmbition)** ← from `experience`:
  `newbie/casual → "finish"`, `regular → "pr"`, `experienced → "elite"`.
- **`configuredAt`** = `Date.now()`.
- **`targetDate`** left undefined (user can set it later via `GoalEditorSheet`).

Add a small helper `buildCoachFromOnboarding(profile)` in `src/lib/user-profile.ts` so the same mapping can be reused (e.g. if profile is edited later).

Result: after pressing "SE MIN PLAN", `/coach` opens with `CoachCard` populated and `TrainingTimeline` rendering the 12-week plan that already incorporates the onboarding ramp-in logic that `buildPlan` supports.

## 2. Expandable per-day session details in `TrainingTimeline`

In `src/components/TrainingTimeline.tsx`, replace each session `<li>` with a nested `Accordion` item (or a small controlled disclosure using local state) so tapping a day reveals:

- Localized session description (re-use the existing `coach.session.*.desc` strings if present; otherwise add new `plan.session.<type>.desc` keys in EN + DA covering: easy, long, tempo, intervals, walkRun, rest).
- Target distance + suggested duration window.
- Pace / effort guidance band derived from session type (e.g. easy → "Zone 2, conversational"; tempo → "Zone 3–4, comfortably hard"; intervals → reps × distance with rest; long → "Zone 2, build endurance"; walkRun → ratio guidance).
- The adjustment reason badge (already shown inline) repeated with a slightly fuller explanation when `adjustedReasonKey` is set.
- A small "Start session" button that navigates to `/` (the run start page) — same intent as the existing CoachCard CTA.

Use the existing `Accordion` primitive nested inside the week accordion (Radix supports nested accordions). Keep the collapsed row visually identical to today (status icon, day, title, km) so the timeline density doesn't change.

## 3. i18n additions

Add EN + DA strings in `src/lib/i18n.tsx`:

- `plan.session.easy.desc`, `plan.session.long.desc`, `plan.session.tempo.desc`, `plan.session.intervals.desc`, `plan.session.walkRun.desc`, `plan.session.rest.desc`
- `plan.session.pace` (label), `plan.session.duration` (label), `plan.session.startCta`

## Files to edit

- `src/lib/user-profile.ts` — export `buildCoachFromOnboarding(profile)`.
- `src/components/Onboarding.tsx` — call it inside `persistAll` so the Coach is configured the moment onboarding ends.
- `src/components/TrainingTimeline.tsx` — convert session row into an expandable disclosure with full description.
- `src/lib/i18n.tsx` — add session description / label keys (EN + DA).

No DB changes, no new packages.
