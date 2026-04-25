## Goal

Apply the same shared font-size approach used for hero tiles to the secondary stats row (e.g. cadence, steps-per-minute, elevation), so all three tiles render their value+unit at the same size and never wrap.

## Changes

**1. `src/lib/stat-metrics.ts`** — add a sibling helper to `heroFontSizeFor`:
```ts
export function secondaryFontSizeFor(
  entries: Array<{ value: string; unit?: string }>,
): { valueClass: string; unitClass: string } {
  const len = entries.reduce(
    (m, e) => Math.max(m, e.value.length + (e.unit ? e.unit.length + 1 : 0)),
    0,
  );
  const valueClass =
    len >= 12 ? "text-xs"
    : len >= 10 ? "text-sm"
    : len >= 9  ? "text-base"
    : "text-lg";
  const unitClass = len >= 11 ? "text-[9px]" : "text-[10px]";
  return { valueClass, unitClass };
}
```
(Note: a partial first attempt already appended this helper to the file; on implementation it will be deduplicated/kept once.)

**2. `src/components/EditableStat.tsx`**
- Add two optional props: `secondaryValueSizeClass`, `secondaryUnitSizeClass`.
- When provided, use them instead of the per-tile `secondaryValueSize` / `secondaryUnitSize` calculation.
- Internal per-tile fallback stays as a safety net.

**3. `src/routes/index.tsx`** — for the secondary section, compute once from all three metric values+units and pass to each tile, mirroring the hero pattern:
```tsx
const secondarySize = secondaryFontSizeFor(
  layout.secondary.map((id) => {
    const def = METRICS[id];
    return { value: def.format(t), unit: def.unitKey ? tr(def.unitKey) : undefined };
  }),
);
```
Pass `secondaryValueSizeClass={secondarySize.valueClass}` and `secondaryUnitSizeClass={secondarySize.unitClass}` to each `EditableStat` in the row.

## Result

All secondary tiles in the row share the same value/unit font size, dictated by the longest entry, so cadence/steps/elevation stay aligned and on a single line within their tiles.
