## Update level labels (Danish + English)

Change the two experience level labels shown in onboarding and on the profile page.

- Danish: "Begynder" → "Motionist", "Ekspert" → "Pro"
- English: "Beginner" → "Recreational", "Expert" → "Pro"

(Hints stay as-is.)

### Files
- `src/lib/i18n.tsx`
  - `profile.level.beginner` (en): `"Beginner"` → `"Recreational"`
  - `profile.level.expert` (en): `"Expert"` → `"Pro"`
  - `profile.level.beginner` (da): `"Begynder"` → `"Motionist"`
  - `profile.level.expert` (da): `"Ekspert"` → `"Pro"`

No code/type changes — internal keys (`beginner` / `expert`) stay the same so saved profiles and logic in `Onboarding.tsx`, `profile.tsx`, and `user-profile.ts` continue to work unchanged.