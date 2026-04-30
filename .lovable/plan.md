## Zone-Based Pacing Mode

Add an optional **HR-Zone Pacing** mode that, while running, recommends a target pace based on the current HR zone and tells the runner whether to speed up, hold, or ease off.

### How it works

Each HR zone (Z1–Z5) maps to a recommended pace range. Defaults are derived from the user's recent runs (median pace) and shifted per zone:

| Zone | Intent | Pace offset vs. easy pace |
|------|--------|---------------------------|
| Z1 Warm-up | Recovery | +90 s/km |
| Z2 Aerobic | Easy / long | +30 s/km |
| Z3 Tempo | Steady | base |
| Z4 Threshold | Hard | −25 s/km |
| Z5 VO₂ | Sprint | −55 s/km |

`base` = median pace from last 10 runs (fallback 6:00/km). All offsets and base are user-overridable.

Live logic (every tracker tick):
- Read `tracker.hrBpm` → resolve `liveZone` (already wired).
- Look up the zone's target pace window.
- Compare against `tracker.currentPaceSecPerKm` (rolling).
- Emit a status: `on-target`, `too-fast`, `too-slow` (±10 s/km dead-band).
- Throttled audio cue every 45 s when off-target (gated by `prVoiceEnabled`).

### UI

**Focus mode chip** (next to the existing HR chip):
`Z2 · target 5:30–6:00 · ↓ ease off`
Color follows the live zone color; arrow + text reflect status.

**Profile → Heart Rate settings** gains a "Zone Pacing" card:
- Toggle on/off (default off).
- Editable base easy pace (m:ss/km).
- Per-zone offset sliders (s/km, ±120).
- "Reset to recommended" button.

### Files to add

- `src/lib/zone-pacing.ts` — types, defaults, `loadZonePacing`/`saveZonePacing` (localStorage `orbit:zone-pacing:v1`), `targetPaceForZone(zone, cfg)`, `paceStatus(currentSec, target)`, custom event `orbit:zone-pacing-update`.
- `src/hooks/use-zone-pacing.ts` — reactive snapshot hook.
- `src/components/ZonePacingChip.tsx` — focus-mode chip; takes `zone`, `currentPaceSecPerKm`, `cfg`.
- `src/components/ZonePacingSettings.tsx` — settings card embedded in HR settings page.

### Files to edit

- `src/components/FocusRunView.tsx` — render `<ZonePacingChip>` when pacing is enabled and `liveZone` is known; trigger throttled `speakLocalized` cue on persistent off-target.
- `src/routes/profile_.heart-rate.tsx` — mount `<ZonePacingSettings>` below the manual-zones block.
- `src/lib/i18n.tsx` — add keys: `pacing.title`, `pacing.enable`, `pacing.basePace`, `pacing.offset`, `pacing.target`, `pacing.tooFast`, `pacing.tooSlow`, `pacing.onTarget`, `pacing.cue.easeOff`, `pacing.cue.pickUp` (en + da).
- `src/lib/audio-cues.ts` — add `speakPacingCue(status, lang, text)` reusing `speakLocalized` with internal 45 s throttle.
- `src/lib/run-utils.ts` — reuse existing `formatPace`; no API change.

### Technical details

- Base pace computed once on settings open via `loadRuns()` median of `avgPaceSecPerKm`, last 10 runs.
- Status dead-band: `|currentSec − targetMid| < 10` → on-target. Above target window → too-slow. Below → too-fast.
- Cue throttle: module-level `lastCueAt` map keyed by status; min 45 s, reset on status change.
- Settings shape:
  ```ts
  type ZonePacingConfig = {
    enabled: boolean;
    baseSecPerKm: number;       // default 360
    offsets: Record<HrZoneId, number>; // default [90,30,0,-25,-55]
    updatedAt: number;
  };
  ```
- Chip is suppressed when `tracker.hrBpm == null` or pacing is disabled.
- No backend changes; pure client persistence.
