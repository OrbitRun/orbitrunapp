## Goal
Remove the RPE chip from the always-visible run header on the History page, and only show RPE when the user expands the card (or navigates to the full run view, which already shows it).

## Changes — `src/routes/history.tsx`

1. **Collapsed header (lines 209-213)** — remove the RPE chip currently rendered next to distance/duration/pace:
   ```tsx
   {typeof run.rpe === "number" && (
     <span className="...">{t("rpe.short")} {run.rpe}/10</span>
   )}
   ```

2. **Expanded `RunDetailPanel`** — add an RPE row so the data is still reachable when the card is folded out. Place it at the top of the panel (above "Insights"), styled consistently with the rest of the panel: small eyebrow label, `run.rpe / 10` value, and a 10-dot intensity meter (matching the pattern already used on the full run detail page). Only render when `typeof run.rpe === "number"`.

## Out of scope
- Full run detail page (`src/routes/run.$id.tsx`) — already displays RPE correctly with the dot meter; no changes.
