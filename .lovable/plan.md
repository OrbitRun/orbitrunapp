## Heart Rate Zones — Settings & App-wide Integration

Build a dedicated "Heart Rate Settings" screen that lets the user generate zones from age + resting HR (Karvonen) or override each zone manually. Persist the result and use it everywhere zones are shown today (analytics card, time-in-zone bar, recovery engine) plus three new touchpoints: live BPM color in Focus Mode, audio coach zone callouts, and a post-run donut.

### What the user gets

1. **Heart Rate Settings page** (`/profile/heart-rate`)
   - Inputs: Age, Resting HR, optional Max HR (auto = 220 − age)
   - "Auto-calculate" button: Karvonen formula generates Z1–Z5 (50/60/70/80/90% HRR)
   - Manual override: each zone has a dual-handle range row (lower/upper BPM) with type-in numeric fields; edits to one zone clamp neighbors so the band stays continuous
   - "Reset to auto" restores Karvonen output
   - Visual: 5 colored stacked blocks (grey/blue/green/orange/red) labeled Z1–Z5 with BPM range and a one-line physiological description per zone
   - Save/Cancel; live preview updates as values change

2. **Profile entry point** — new row in `src/routes/profile.tsx` ("Heart rate zones · 142–172 bpm" summary) navigating to the new page.

3. **Focus Mode live color** — current BPM number tints by active zone (grey/blue/green/orange/red). Subtle glow on Z4/Z5.

4. **Audio coach cue** — when the runner crosses into a new zone for ≥10s, the coach speaks: *"You're now in Zone 4."* (gated by `prVoiceEnabled`, throttled to once per zone per 60s).

5. **Post-run donut** — new `HrZoneDonut` rendered above the existing stacked bar in `HrZoneBar`, showing % per zone with the same color ramp.

### Files to add

- `src/lib/hr-zones-config.ts` — types (`HrZoneConfig`, `ZoneRange`), Karvonen calculator, validators, load/save to localStorage (`orbit:hr-zones:v1`), zone color tokens, descriptions (en/da), and a `zoneForBpm(bpm, config)` helper that replaces the constant-based `zoneFor`.
- `src/hooks/use-hr-zones.ts` — reactive hook similar to `use-user-profile`, broadcasts `orbit:hr-zones-update`.
- `src/routes/profile.heart-rate.tsx` — the settings screen (TanStack file route, child of profile layout).
- `src/components/HrZoneDonut.tsx` — SVG donut with center label.

### Files to modify

- `src/lib/hr-analysis.ts` — keep `DEFAULT_MAX_HR` for fallback; `zoneFor` reads from saved config when present (sync read of localStorage cached at module level, refreshed on update event).
- `src/lib/hr-zones.ts` — `timeInZones` accepts an optional `HrZoneConfig`.
- `src/lib/hr-graph.ts` — `zoneBoundaries` derives from config when supplied.
- `src/components/HrAnalyticsCard.tsx` — pass user config into boundaries + summary.
- `src/components/HrZoneBar.tsx` — render `HrZoneDonut` above the existing stacked bar; pull config-driven labels.
- `src/components/FocusRunView.tsx` — color the BPM readout based on `zoneForBpm`.
- `src/hooks/use-run-tracker.ts` — emit a `zone-change` event to the audio cue layer.
- `src/lib/audio-cues.ts` — handle the new "zone changed" cue with throttling.
- `src/lib/i18n.tsx` — add strings: page title, field labels, zone names, descriptions, audio cue templates (en + da).

### Technical details

- **Karvonen**: `targetBpm = ((maxHR − restingHR) × pct) + restingHR` with pct boundaries `[0.50, 0.60, 0.70, 0.80, 0.90, 1.00]` → 5 contiguous zones.
- **Storage shape**:
  ```text
  { age, restingHr, maxHr, source: "karvonen" | "manual",
    zones: [{ z: 1..5, lower: number, upper: number }] }
  ```
- **Validation**: 30 ≤ resting < max ≤ 230, each zone lower < upper, zones contiguous (lower[n+1] = upper[n] + 1). Invalid input shows inline error and disables Save.
- **Color tokens** (added to `src/styles.css`): `--hr-z1` grey, `--hr-z2` blue, `--hr-z3` green (neon-aligned), `--hr-z4` orange (Orbit orange), `--hr-z5` red. Reused by donut, bar, and Focus BPM tint.
- **Backwards compat**: when no config saved, zones fall back to current `DEFAULT_MAX_HR`-based percentages so historical runs still render correctly.

### Out of scope

- Changing how raw HR samples are captured.
- Lab-test import (CSV/file). Manual entry covers the "tested in a lab" case.