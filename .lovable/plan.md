## Add fourth experience level "Elite" + EN renames

### New level mapping (general onboarding + profile)

| id | DA label | EN label | Voice cue | Run-page metrics |
|---|---|---|---|---|
| `novice` | Begynder | Beginner | every 500 m | beginner layout |
| `beginner` | Motionist | Jogger (renamed from Recreational) | every 1 km | beginner layout |
| `expert` | Erfaren | Expert (renamed from Pro) | every 1 km | expert layout |
| `elite` (new) | Elite | Elite | every 1 km | same as expert layout |

### Files to change

1. **`src/lib/user-profile.ts`**
   - `ExperienceLevel = "novice" | "beginner" | "expert" | "elite"`.
   - Add a fourth value `"elite"` to the coach-side `Experience` type → `"beginner" | "recreational" | "experienced" | "elite"`. Append to `EXPERIENCES` array.
   - Extend `experienceLabel()` with `elite` → DA "Elite", EN "Elite".

2. **`src/lib/stat-metrics.ts`**
   - Add `elite` entry to `LEVEL_LAYOUTS`, identical to current `expert` layout (hero: distance + pace, secondary: duration + cadence + hrBpm).

3. **`src/lib/i18n.tsx`** (EN + DA)
   - EN: rename `profile.level.beginner` "Recreational" → "Jogger"; rename `profile.level.expert` "Pro" → "Expert"; add `profile.level.elite` = "Elite" + `profile.level.eliteHint` = "Advanced metrics · ambitious training plan".
   - DA: add `profile.level.elite` = "Elite" + `profile.level.eliteHint` = "Avancerede mål · ambitiøs træningsplan". Keep existing DA labels (Motionist / Erfaren) unchanged.
   - Add `coach.opt.experience.elite` (EN "Elite", DA "Elite").

4. **`src/components/Onboarding.tsx`**
   - Level options array → `["novice", "beginner", "expert", "elite"]`.
   - Switch grid from `grid-cols-3` to `grid-cols-2` so a 2×2 layout shows all four cards. Tighten card padding for 390 px.
   - `finish()` cue mapping: `novice → 500`, all others → `1000`.

5. **`src/routes/profile.tsx`**
   - Level options `["novice", "beginner", "expert", "elite"]`.
   - Switch grid from `grid-cols-3` to `grid-cols-2` (2×2 layout per the user's request).
   - Auto-cue mapping on level change: `novice → 500`, others → `1000`.

6. **`src/components/CoachOnboarding.tsx`**
   - `EXPERIENCES` already drives the buttons; once `elite` is appended in user-profile.ts it appears automatically. Switch the experience step grid to `grid-cols-2` if it isn't already, so 4 options display 2×2.

7. **`src/lib/coach-plan.ts`** (Elite = more ambitious)
   - When `c.experience === "elite"`, skip the early-week deload (no `mult < 1`/intensity cap entries from low-volume rules) and bump weekly session count by +1 (cap at 6) in `weeklySessionsFor` via an override applied in `getCoachPlan`. This makes Elite plans start at full volume immediately and run a denser week.

8. **`src/lib/user-profile.ts` → `nextCoachSession`** (Elite ambition in daily session)
   - For `c.experience === "elite"`, scale `base` distance by ×1.25 and prefer the harder option in branches (e.g. always pick intervals over easy when goal is `runFaster`/`finish10k`, regardless of `frequency`). Keep cue mapping unchanged.

### Out of scope
- No DB / backend changes.
- Existing saved profiles remain valid (no migration; new id is additive).
- Run page metric registry untouched (Elite reuses Expert layout).
