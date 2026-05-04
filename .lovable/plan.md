## Problem

In the "Nedtælling før start" row on Profile, tapping the chevron arrow does not expand the explanation. The native `<select>` is absolutely positioned with `inset-0` over the entire row, sitting on top of the chevron button, so taps on the arrow open the picker instead of toggling the info panel.

## Fix

Edit `src/routes/profile.tsx` in the `CountdownPickerRow` component:

1. Wrap the label + chevron area in a container with `relative z-10` so it sits above the transparent `<select>` overlay.
2. Keep the `<select>` as the row-wide tap target for value changes, but ensure the chevron button has higher stacking and its own click handler that toggles `open` (already present) — the z-index is what's missing.
3. Also give the value text (`display`) `relative z-10 pointer-events-none` so layout is unaffected but the chevron remains clickable.

No other files affected. This matches the working pattern used by `SettingRowWithInfo`.

## Technical detail

```tsx
<div className="relative z-10 flex items-center gap-1 flex-1 min-w-0">
  <div className="text-sm font-semibold truncate">{label}</div>
  <button ...chevron toggle... />
</div>
<div className="relative z-10 text-xs text-muted-foreground pointer-events-none">{display}</div>
<select className="absolute inset-0 opacity-0 cursor-pointer" ... />
```

The select still covers the icon and empty row areas so tapping the row opens the picker, while the chevron stays interactive.