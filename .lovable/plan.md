## Plan: Orbit Coach text fixes & voice cue consolidation

### 1. Add missing English `coach.adjust.note.*` keys
In `src/lib/i18n.tsx` (English block, near line 681 where other coach keys live), add the 4 keys that today only exist in the Danish block (line 1281–1284). Without these, EN renders the raw `COACH.ADJUST.NOTE.INJURYPAST` string.

```ts
"coach.adjust.note.injuryCurrent": "GENTLE COMEBACK — PROTECTING YOUR INJURY",
"coach.adjust.note.injuryPast": "EASING IN AFTER PREVIOUS INJURY",
"coach.adjust.note.lowVolume": "GRADUAL BUILD-UP — AVOIDING TOO MUCH TOO SOON",
"coach.adjust.note.lifestyle": "LOWER LOAD — SLEEP & STRESS RECOVERY",
```

### 2. Rewrite the Danish "past injury" copy
In `src/lib/i18n.tsx` line 1282, replace `"Letter dig ind efter tidligere skade"` with `"GENOPBYGNING EFTER TIDLIGERE SKADE"`. Also uppercase the other three DA `coach.adjust.note.*` strings so they match the on-screen treatment.

The neon-green / uppercase styling already comes from the existing classes in `CoachCard.tsx` (`text-neon font-bold uppercase tracking-[0.12em]`) — no styling changes needed.

### 3. Merge voice-cue settings into one 3-state row
Currently `src/routes/profile.tsx` shows two separate rows in the General section:
- `profile.audio` — cycles 500m / 1km (`audioCueMeters`)
- `profile.voiceCues` — on/off (`voiceCuesEnabled`)

Replace these two rows with a single `SettingRowWithInfo` that cycles **Off → 500m → 1km → Off** on tap.

- New `cycleVoiceCues()` helper:
  - Off (`voiceCuesEnabled: false`) → `{ voiceCuesEnabled: true, audioCueMeters: 500 }`
  - 500m → `{ audioCueMeters: 1000 }`
  - 1km → `{ voiceCuesEnabled: false }`
- `valueText` resolves to one of three new i18n keys: `profile.voiceCues.value.off`, `profile.voiceCues.value.500`, `profile.voiceCues.value.1000`.
- Keep the `Mic` icon and reuse `profile.voiceCues.info` tooltip.
- The existing `profile.coachVoiceCues` row stays as-is (separate coach gate).
- The level-change auto-sync in `update()` (line 98) keeps working because `audioCueMeters` is still the underlying field.

Add the three new value strings in both EN and DA blocks of `src/lib/i18n.tsx`:
- EN: `"Off"`, `"Every 500 m"`, `"Every 1 km"`
- DA: `"Fra"`, `"Hver 500 m"`, `"Hver 1 km"`

### Files touched
- `src/lib/i18n.tsx` — add 4 EN `coach.adjust.note.*` keys; rewrite/uppercase the 4 DA ones; add 3 new `profile.voiceCues.value.*` keys per language.
- `src/routes/profile.tsx` — remove the standalone audio-interval row, replace voice-cues row with a 3-state cycle, drop the now-unused `toggleAudioCue` helper.

No business-logic changes elsewhere; consumers of `voiceCuesEnabled` and `audioCueMeters` keep working unchanged.