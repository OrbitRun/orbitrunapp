## Goal
Fix the Daily Status strip on the home screen so:
1. The left score reads as `78/100` (not just `78`).
2. "Klar til træning" (band label) always fits on one line next to the score.
3. The redundant "Score 78/100." prefix is removed from the coach recommendation (now duplicated by the new `xx/100` on the left).
4. The remaining recommendation text wraps onto multiple lines instead of being cut off with an ellipsis.

## Changes

### `src/components/DailyStatusStrip.tsx`
Restructure the right-hand text block:

- **Score**: render as `{r.score}` followed by a smaller `/100` suffix (e.g. `text-sm` for the number, `text-[9px] text-muted-foreground` for `/100`), all on the same baseline row as the band label.
- **Band label**: add `whitespace-nowrap` so "Klar til træning" never wraps or truncates.
- **Recommendation**: move to a second line below the score+band row. Remove `truncate` so it wraps freely (`text-[10px] leading-snug text-foreground/80`, no `· ` prefix).
- Strip the leading `Score NN/100. ` prefix from the displayed recommendation with a regex (`recommendation.replace(/^Score\s+\d+\/100\.\s*/i, "")`) so the shared i18n strings used by `ReadinessPanel` stay untouched.

No other files change. `ReadinessPanel` keeps the original full sentence including the score.

## Result
The compact strip becomes:

```
●  DAGENS STATUS
   78/100  Klar til træning
   Du er restitueret og klar — kør dagens pas som planlagt.
```

Long recommendations (e.g. heat-adjust copy) wrap to 2–3 lines instead of being clipped.