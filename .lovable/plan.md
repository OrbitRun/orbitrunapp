# Add "Begynder" experience level

## Goal
Today there are two levels: `beginner` (DA "Motionist", 500 m cues) and `expert` (DA "Pro", 1 km cues). Add a new third level so general onboarding/profile match the coach onboarding terminology.

## New level structure

| Internal id | DA label | EN label | Voice cue | Run-page data fields |
|---|---|---|---|---|
| `novice` (new) | Begynder | Beginner | every **500 m** | same as Motionist (hero: distance + duration, secondary: pace + avgPace + calories) |
| `beginner` (existing id, relabeled) | Motionist | Recreational | every **1 km** | unchanged |
| `expert` | Erfaren | Pro | unchanged | unchanged |

`AudioCueMeters` stays `500 | 1000`. No new metrics.

## Files to change

1. **`src/lib/user-profile.ts`**
   - `ExperienceLevel = "novice" | "beginner" | "expert"`.
   - `DEFAULT_PROFILE.level` stays `beginner` (existing users unaffected).

2. **`src/lib/stat-metrics.ts`**
   - Add `novice` entry to `LEVEL_LAYOUTS`, identical to current `beginner` layout.

3. **`src/lib/i18n.tsx`** (EN + DA blocks)
   - Add `profile.level.novice` / `profile.level.noviceHint`.
     - DA: "Begynder" / "Grundlæggende stats · stemmesignal hver 500 m".
     - EN: "Beginner" / "Essential stats · voice cue every 500 m".
   - Update `profile.level.beginner` → DA "Motionist" (already), EN "Recreational"; hint EN "…voice cue every 1 km", DA "…stemmesignal hver 1 km".
   - Update `profile.level.expert` → DA "Erfaren" (was "Pro"), EN stays "Pro".

4. **`src/components/Onboarding.tsx`**
   - Level options `["novice", "beginner", "expert"]`.
   - Default `useState` → `"novice"`.
   - `finish()` cue mapping: `novice → 500`, `beginner → 1000`, `expert → 1000`.
   - Switch the level grid to `grid-cols-3` with tighter padding so three cards fit at 390 px.

5. **`src/routes/profile.tsx`**
   - Level options `["novice", "beginner", "expert"]`.
   - Auto-cue mapping on level change: `novice → 500`, `beginner → 1000`, `expert → 1000`.
   - Keep manual audioCueMeters toggle intact.

## Out of scope
- Coach onboarding (separate `experience` enum — untouched).
- No migration needed; existing saved `beginner` profiles still valid.
- No DB / backend changes.
