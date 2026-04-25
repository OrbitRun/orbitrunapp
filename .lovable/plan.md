## Goal

Make the run screen's stat tiles adapt to the user's experience level:

- **Beginner**: hero = Distance, Duration · secondary = Pace, Avg. pace, Calories
- **Expert**: hero = Pace, Distance · secondary = Duration, Cadence, Elevation

The user can still customize the layout via the edit/picker UI; their custom layout is preserved per level.

## Changes

### 1. `src/lib/stat-metrics.ts`
- Add level-based default layouts:
  ```ts
  export const LEVEL_LAYOUTS: Record<ExperienceLevel, StatLayout> = {
    beginner: { hero: ["distance", "duration"], secondary: ["pace", "avgPace", "calories"] },
    expert:   { hero: ["pace", "distance"],     secondary: ["duration", "cadence", "elevation"] },
  };
  ```
- Namespace storage per level: key becomes `orbit:stat-layout:v2:<level>`.
- Update `loadLayout(level)` and `saveLayout(layout, level)` to take the level and fall back to `LEVEL_LAYOUTS[level]` (instead of one global `DEFAULT_LAYOUT`). Keep `DEFAULT_LAYOUT` as the beginner preset for backward compatibility.

### 2. `src/routes/index.tsx`
- Pass `profile.level` to `loadLayout` and `saveLayout`.
- Re-load layout when `profile.level` changes (via the existing `orbit:profile-update` listener / a `useEffect` keyed on `profile.level`), so switching level in the profile screen instantly updates the run screen tiles to that level's preset (or that level's previously-saved custom layout).

### Notes
- No i18n changes needed — all metrics already exist with translations.
- Customizations stay sticky per level: a beginner who tweaks their layout keeps it; switching to expert shows the expert preset (or expert's own customizations).
