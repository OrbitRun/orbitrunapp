## Next workout suggestion button

Add a "Next workout" CTA at the bottom of the Goal Progress card. Tapping it expands a recommended workout card (type, distance, target pace, reason, on-track badge) plus a "Start this run" button that navigates to the run screen.

### Suggestion logic

A pure function `buildSuggestion(goal, runs, progress)` returns `{ type, distanceKm, paceSecPerKm, reason, onTrack }`. "On track" = progress ≥ 70%.

| Goal | On track (≥70%) | Behind (<70%) |
|---|---|---|
| Run 5K / 10K / Half / Marathon | **Tempo** ~50% of goal distance @ (recent best 1k pace + 20s) | **Long run** = last longest +15% (min +0.5km), capped at goal target |
| Run faster | **Easy** 4 km @ recent best 1k + 60s | **Intervals** 5 × 1 km @ recent best 1k pace |
| Weight loss | **Recovery** ~80% of last run distance | **Easy** last run distance +1 km (4–10 km) |
| Any goal, no runs yet | **First run** 2 km, comfortable | — |

### UI changes (`src/components/GoalProgress.tsx`)

- Add `useState` toggle `showSuggestion`.
- New button below the existing hint row: neon outline pill with `Sparkles` icon, label `goal.suggest.cta` / `goal.suggest.hide`.
- When expanded, render an inset card with:
  - Workout type label + on-track/behind chip
  - Distance + optional `@ pace /km`
  - Short reason sentence
  - `<Link to="/">` "Start this run" CTA (neon filled)
  - Small `X` to dismiss
- Reuses existing `formatPace`, `unit.km`, `unit.perKm` keys.

### i18n keys (en + da) to add in `src/lib/i18n.tsx`

- `goal.suggest.cta`, `goal.suggest.hide`, `goal.suggest.start`
- `goal.suggest.onTrack`, `goal.suggest.behind`
- `goal.suggest.type.easy|long|tempo|intervals|recovery|first`
- `goal.suggest.reason.first|distanceOnTrack|distanceBehind|fasterOnTrack|fasterBehind|weightOnTrack|weightBehind|default`

### Notes

- No new files or deps. Suggestion is computed from existing `runs` already passed to `GoalProgress`.
- The "Start this run" button just navigates to `/` for now; hooking the suggested distance/pace into the run tracker UI as a banner can be a follow-up if you want.
