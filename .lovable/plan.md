## Past run page — shoe + record badges row, RPE below

Single file: `src/routes/run.$id.tsx`.

### What changes

1. **Shoe + record badges share one row.** Wrap the existing shoe button in a flex container and add a compact "New PR" badge group on the right. The badge group lists every PR category whose `runId` matches this run (looked up from `loadPrs()`) — e.g. `5K`, `FASTEST KM`. Uses neon styling (`bg-neon/10 border-neon/40` container, neon pill chips), Trophy icon, and `pr.newPr` + `pr.cat.*` i18n keys.
2. **RPE moves below.** Remove the RPE `StatTile` from the 2x2 stats grid. Add a dedicated full-width row directly under the shoe/badges row showing the RPE label, value (e.g. "7 / 10"), and a 10-dot intensity meter.

If the run owns no PRs, the right side simply doesn't render and the shoe button takes the full row width — same as today. If RPE wasn't logged, that row is omitted.

### Imports added
- `Trophy` from lucide-react
- `loadPrs`, `PR_ORDER`, `PrCategory` from `@/lib/personal-records`

No other layout, color, or behavior changes.
