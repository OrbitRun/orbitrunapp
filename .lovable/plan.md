## Personal Recovery Engine

A datadrevet restitutionsmotor: ingen glow, ingen pynt — kun rå tal og direkte tekst.

### 1. The Brain — `src/lib/recovery-engine.ts` (new)

Pure functions over `Run[]`. No UI. No side effects.

**Baseline (last 28 days, excluding the run being analyzed):**
- `weeklyAvgKm` = total distance ÷ (days span / 7), min 1 run required
- `easyPaceSecPerKm` = median pace of runs ≥ 60s/km slower than the fastest run (or simple median if too few)
- `runCount28d`, `lastRunDaysAgo`

**Per-run analysis (`analyzeRun(run, history)`):**
- `distanceRatio` = run.distanceM / (weeklyAvgKm * 1000 / runsPerWeek), clamp 0.3–3
- `paceDelta` = easyPaceSecPerKm − run.avgPaceSecPerKm (positive = faster than easy)
- `rpe` = run.rpe (default 5 if missing)
- `intensityScore` = base 24h, then:
  - +12h if distanceRatio > 1.20
  - +12h if paceDelta > 20s/km (markedly faster than easy)
  - ×1.25 multiplier if rpe ≥ 8 AND (distanceRatio > 1.2 OR paceDelta > 20)
  - −6h if distanceRatio < 0.7 AND paceDelta < −15 (recovery run)
- `recommendedHours` = clamped 12–72, rounded to 12/24/36/48/72
- `scenario` = `"maintenance" | "overreaching" | "recovery" | "firstRun"`

**`recoveryStatus(history, now)`** for dashboard:
- Reads most recent run + its analysis
- Returns `{ hoursRemaining, readyAt, status: "ready" | "recovering" | "rest", label, sublabel }`
- `ready` when now ≥ readyAt; `rest` when hoursRemaining > 36

All strings come from i18n keys; the lib returns keys + interpolation params, not localized text.

### 2. Post-Run Insight — surfaced in `RunSummary.tsx`

New compact section below the stat tiles, above the splits:

```text
┌─────────────────────────────────────┐
│ RESTITUTION                         │
│ Din længste tur i 3 uger.           │
│ Hvil 48 timer · klar fre 07:30      │
└─────────────────────────────────────┘
```

- Plain border, no glow, no neon background. Mono/uppercase eyebrow + display font for the headline.
- Headline picks one of ~6 templates per scenario based on which signal dominated (longest in N weeks, fastest pace in N weeks, recovery run, baseline-day, first run).
- Subtext: hours + ready timestamp.
- Renders only if there are ≥1 prior runs OR the run itself is non-trivial; otherwise shows "First run logged — baseline started."

Insight is computed AFTER `RpePrompt` resolves (so RPE feeds the multiplier). Approach: lift insight rendering so it appears once `run.rpe` is set, OR compute with default rpe=5 and re-render when RPE arrives. We'll do the latter — the summary stays open until user saves; but RPE prompt fires after save. So: move insight into a small banner shown on the index page after RPE submit, AND a static version in the summary using rpe=5 placeholder. Cleaner alternative: prompt for RPE inside the summary screen before save. Decision: **inline the RPE prompt into RunSummary** (replaces the modal flow) so insight uses real RPE immediately. The current modal-after-save flow is removed.

### 3. Dashboard Recovery Status — `src/routes/index.tsx`

New `<RecoveryStatus />` component placed directly under `<CoachCard />` on the home screen, visible only when there's at least one saved run.

```text
┌─────────────────────────────────────┐
│ RESTITUTION              48 / 48 t  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Hård tur i går. Hvil til fre 07:30. │
└─────────────────────────────────────┘
```

- Updates every 60s via interval and on `orbit:run-updated` / `orbit:run-stop` events
- Progress bar = `1 − hoursRemaining / totalRecoveryHours`
- States: `ready` (green text "Klar til løb"), `recovering` (neutral), `rest` (muted "Hviledag anbefalet")
- No glow. Single hairline border. Tabular numerals.

### 4. i18n Strings — `src/lib/i18n.tsx`

Add namespace `recovery.*` for both `en` and `da`:

- `recovery.eyebrow` — "RECOVERY" / "RESTITUTION"
- `recovery.ready` — "Ready to run" / "Klar til løb"
- `recovery.hoursLeft` — "{hours}h until ready" / "{hours} t til klar"
- `recovery.readyAt` — "Ready {time}" / "Klar {time}"
- `recovery.scenario.maintenance` — "Body knows this load. Ready in 24h." / "Din krop kender denne belastning. Klar igen om 24 timer."
- `recovery.scenario.overreaching.distance` — "{pct}% longer than your average. Rest 48h." / "{pct}% længere end dit snit. Hvil 48 timer."
- `recovery.scenario.overreaching.pace` — "Faster than easy pace. Rest 48h." / "Hurtigere end roligt tempo. Hvil 48 timer."
- `recovery.scenario.overreaching.both` — "Long and hard. Rest 48h." / "Lang og hård. Hvil 48 timer."
- `recovery.scenario.recovery` — "Active recovery dialed in. Legs fresh tomorrow." / "Perfekt aktiv restitution. Friske ben i morgen."
- `recovery.scenario.firstRun` — "First run logged. Baseline starting." / "Første tur logget. Baseline begynder."
- `recovery.headline.longestInWeeks` — "Longest run in {weeks} weeks." / "Din længste tur i {weeks} uger."
- `recovery.headline.fastestInWeeks` — "Fastest pace in {weeks} weeks." / "Hurtigste tempo i {weeks} uger."
- `recovery.headline.normalLoad` — "Normal load." / "Normal belastning."
- `recovery.headline.recoveryRun` — "Easy shake-out." / "Rolig udløsning."

### 5. RPE flow change

- Inline RPE picker into `RunSummary` (compact horizontal 1–10 row, same styling) directly above the recovery insight. Required-ish — defaults to 5 if user saves without picking.
- Remove the post-save modal RPE flow from `src/routes/index.tsx` (delete `RpePrompt` overlay usage). Keep `RpePrompt.tsx` file for now (unused, can clean up later).
- `RunSummary` accepts `onSave(rpe?: number)` and writes RPE in the same commit.

### 6. Style enforcement

Throughout the recovery UI:
- No `shadow-neon`, no `pulse-ring`, no `text-neon` for body text (eyebrow only, in muted-foreground).
- Use `border-white/10`, `bg-white/[0.03]`, mono/tabular numerals.
- One typographic accent: tabular hour count in display font.

### Files

**New**
- `src/lib/recovery-engine.ts` — baseline, analysis, status
- `src/components/RecoveryInsight.tsx` — used inside `RunSummary`
- `src/components/RecoveryStatus.tsx` — dashboard card

**Edited**
- `src/lib/i18n.tsx` — `recovery.*` keys (en + da)
- `src/components/RunSummary.tsx` — inline RPE picker + `<RecoveryInsight />`
- `src/routes/index.tsx` — mount `<RecoveryStatus />` under `<CoachCard />`, remove post-save RPE modal, update `onSave` to accept rpe
- `src/components/RpePrompt.tsx` — left in place, no longer rendered (safe no-op)

### Open question (non-blocking)

If you want the recovery card visible even before any runs exist (with a "log a run to start baseline" empty state), say so — default plan hides it until first run.
