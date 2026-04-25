## Goal

The two hero tiles on the run screen (e.g. Distance + Duration/Pace) currently render at different font sizes because each tile auto-shrinks based on its own value length. Distance ("1.24") shows at 44px while Duration ("0:00:00") shrinks to 26px, making the row look unbalanced. They also don't share label/value alignment.

## Approach

Compute a **shared** hero font size in the parent (`src/routes/index.tsx`) based on the longest of the two hero values, then pass it into `EditableStat` so both tiles render at the same size. Tighten internal layout so labels and values align consistently and never overflow at 339px viewport width.

## Changes

**1. `src/lib/stat-metrics.ts`** — export a small helper:
```ts
export function heroFontSizeFor(values: string[]): string {
  const len = Math.max(...values.map(v => v.length));
  if (len >= 8) return "text-[26px]";
  if (len >= 7) return "text-[30px]";
  if (len >= 5) return "text-[34px]";
  return "text-[40px]";
}
```
(Slightly lower top end so both tiles fit comfortably side-by-side in a 339px viewport.)

**2. `src/routes/index.tsx`** — compute shared size from both hero metric values and pass via a new optional prop `heroValueSizeClass` to each `EditableStat`.

**3. `src/components/EditableStat.tsx`**
- Accept optional `heroValueSizeClass` prop; when provided, use it instead of the internal per-value `heroValueSize` calculation.
- Align hero content consistently: label centered (already), value row centered with shared baseline, unit at fixed `text-xs` (already). Keep `whitespace-nowrap`, `overflow-hidden`, `min-w-0`, `px-1` safety net.
- Keep secondary tile logic unchanged.

## Result

Both hero tiles render their numbers at the same font size, labels and values align across the row, and content stays on one line within each tile at the current viewport.
