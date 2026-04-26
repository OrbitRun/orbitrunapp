## Redesign Coach Onboarding

Bring `CoachOnboarding.tsx` in line with the main `Onboarding.tsx` look (neon palette, glass card, shadow-neon CTAs) and update the goal options + add a conditional follow-up.

### Visual changes (`src/components/CoachOnboarding.tsx`)
- Replace the flat `bg-background border border-white/10` card with `glass-strong rounded-3xl shadow-card`.
- Switch the Sparkles header chip from `text-foreground/80` to `text-neon`.
- Step progress bars: active segment becomes `bg-neon` (instead of `bg-foreground`).
- Selected option buttons: `bg-neon text-primary-foreground` (instead of `bg-foreground text-background`); unselected stays `bg-white/5 border border-white/10`.
- Primary Next/Save buttons: `bg-neon text-primary-foreground shadow-neon`.
- Keep layout, spacing, and step indicator structure consistent with `Onboarding.tsx`.

### Goal question changes
Replace the current goal list with these six options, in this order:
`finish5k`, `finish10k`, `halfMarathon`, `marathon`, `runFaster`, `weightLoss`.

Render as a 2-column grid (matching the main onboarding goal grid), centered text, `h-14` tiles.

### New conditional step: "Run faster" distance
- If `goal === "runFaster"`, insert an additional step after the goal step asking "Hvilken distance vil du blive hurtigere på?" / "Which distance do you want to get faster at?"
- Options: `5k`, `10k`, `halfMarathon`, `marathon` (2-column grid).
- Total steps become dynamic: 3 normally, 4 when `runFaster` is selected. Progress bar segment count adapts.
- If user picks `runFaster` then a distance, store it on the coach config so `nextCoachSession` can pick the right workout focus.

### Data model (`src/lib/user-profile.ts`)
- Extend `CoachGoal` union to include `finish10k` (rename current `faster10k` semantics: keep `faster10k` value but it will be derived from `runFaster + distance`). New union:
  `"weightLoss" | "finish5k" | "finish10k" | "halfMarathon" | "marathon" | "runFaster"`.
- Add `fasterDistance?: "5k" | "10k" | "halfMarathon" | "marathon"` to `CoachConfig`.
- Update `coachGoalLabel` with EN/DA strings for all six options (incl. `finish10k` and `runFaster`); remove `faster10k` from the label map.
- Update `nextCoachTask` and `nextCoachSession` switch statements:
  - `finish5k`: unchanged.
  - `finish10k`: easy/long around 6–8 km depending on level.
  - `runFaster`: pick tempo/intervals scaled to `fasterDistance` (5k → 400m intervals, 10k → 800m intervals, half → tempo 6–8 km, marathon → tempo 10 km).
  - Remove the old `faster10k` branch.

### i18n (`src/lib/i18n.tsx`)
- Add/adjust localized labels for new goal keys (`finish10k`, `runFaster`) and the new step prompt `coach.q.fasterDistance` (EN + DA).
- Add labels for the four distance choices if not already present (reuse existing where possible).

### Files touched
- `src/components/CoachOnboarding.tsx` (visual rework + extra step + state for `fasterDistance`)
- `src/lib/user-profile.ts` (`CoachGoal`, `CoachConfig`, label map, session/task logic)
- `src/lib/i18n.tsx` (new strings)

No changes needed to `CoachCard.tsx` — it consumes `nextCoachSession`, which keeps the same shape.
