## Goal
In `DailyStatusStrip`, make `78/100` and `Klar til træning` render at the same font size with shared baseline alignment, taking the score number's size as the reference.

## Change — `src/components/DailyStatusStrip.tsx`

Currently:
- Score number: `text-sm` (14px), bold display font
- `/100` suffix: `text-[9px]`
- Band label: `text-[10px]` muted

Update the score+band row so all three pieces share the same size and baseline:

- Wrap score+band in `flex items-baseline gap-2` (already baseline, just bump gap a touch).
- Score number `{r.score}`: keep `font-display font-black tabular text-sm leading-none` (this is the reference size).
- `/100` suffix: change from `text-[9px]` → `text-sm` so it matches the number; keep muted color and bold weight, drop the `ml-0.5` so it reads as one token. Remove `leading-none` mismatch.
- Band label `{t(\`readiness.band.${r.band}\`)}`: change from `text-[10px]` → `text-sm`, keep `font-bold`, `whitespace-nowrap`, `leading-none`, muted color. This guarantees the label sits on the exact same baseline as the score on every device (iOS Safari + Android Chrome both honor `items-baseline` consistently when sizes match).

Result row markup:
```tsx
<div className="mt-1 flex items-baseline gap-2">
  <span className="font-display font-black tabular text-sm leading-none" style={{ color }}>
    {r.score}<span className="text-sm text-muted-foreground font-bold">/100</span>
  </span>
  <span className="text-sm font-bold leading-none whitespace-nowrap text-muted-foreground">
    {t(`readiness.band.${r.band}`)}
  </span>
</div>
```

No other files change. Recommendation line below remains unchanged.

## Result
`78/100  Klar til træning` renders at identical 14px size, sharing one baseline, on both iPhone and Android viewports (390px wide and up). The label still fits on one line thanks to `whitespace-nowrap`; the recommendation continues to wrap on its own line below.
