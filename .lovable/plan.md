# Fit run-screen stat numbers to one line

## Problem
On narrow viewports (≈339px), hero tile values (44px font) like `0:00:00` or `5:30/km` can wrap or visually overflow the rounded box. Secondary tiles already have a basic auto-shrink but can still feel tight.

## Approach
Update `src/components/EditableStat.tsx` so each tile guarantees its value+unit stays on a single line and inside the box, regardless of the metric or viewport width.

### Hero tiles
- Add a length-based auto-shrink ladder for the value (similar to the secondary one):
  - ≤4 chars → `text-[44px]`
  - 5–6 chars → `text-[36px]`
  - 7 chars → `text-[30px]`
  - ≥8 chars → `text-[26px]`
- Wrap the value+unit row in `whitespace-nowrap` so it never breaks across two lines.
- Keep `min-w-0` on the inner flex row so it can shrink within the tile.

### Secondary tiles
- Keep the existing ladder but extend it for very long combined strings (e.g. `7:30/km` + unit) and ensure `whitespace-nowrap` + `overflow-hidden` on the row.
- Tighten the smallest size to `text-xs` when combined length ≥ 12 to avoid edge clipping at 339px width.

### Safety net
- Add `overflow-hidden` to the tile container so even an unexpectedly long value cannot visually escape the rounded box.

## Files
- `src/components/EditableStat.tsx` — only file touched.

## Out of scope
- No layout/grid changes, no metric registry changes, no localization changes.
