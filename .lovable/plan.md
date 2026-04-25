## Add 10K and Half marathon goals

Extend the `RunningGoal` type with two new values and surface them in the onboarding and profile goal pickers.

### Changes

1. **`src/lib/user-profile.ts`**
   - Extend `RunningGoal` union: `"run5k" | "run10k" | "runFaster" | "weightLoss" | "halfMarathon" | "marathon"`.
   - Add labels to both `en` and `da` maps in `goalLabel`:
     - `run10k` → "Run 10K" / "Løb 10km"
     - `halfMarathon` → "Half marathon" / "Halvmarathon"

2. **`src/components/Onboarding.tsx`**
   - Update the `goals` array to include the new options in a sensible order: `["run5k", "run10k", "halfMarathon", "marathon", "runFaster", "weightLoss"]`.
   - The existing 2-column grid already handles 6 options cleanly (3 rows).

3. **`src/routes/profile.tsx`**
   - Mirror the same updated `goals` array so the profile editor exposes the new choices.

### Notes

- No migration needed — existing stored profiles keep their current goal value; the union just widens.
- `goalLabel` is the single source of truth for display strings, so `index.tsx` greeting and any other consumer pick up the new labels automatically.
- No i18n.tsx changes required (goal labels live in `user-profile.ts`, not the i18n dictionary).
