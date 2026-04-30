## Reintroduce Flight Recorder with info box

Restore the Flight Recorder safety net (auto-saves your run to local storage so a crash, refresh, or app kill never loses it), expose it as a toggle inside the **General settings** section in Profile, and add a small info box that explains what happens when it's on vs. off.

### What you'll see

In Profile → general settings (the section that holds Stemmesignal / PR / Auto-pause / Vibrering / Vindenhed / Sprog), a new **"Flight Recorder"** row appears directly below **"Auto-pause"**, with the same row style as Coach.

Below that row sits a compact info box (matching the glass card style) that explains:

- **When ON:** "Dit løb gemmes automatisk hvert sekund lokalt på telefonen. Hvis appen crasher eller mister forbindelsen, kan du gendanne løbet næste gang du åbner Orbit Lab."
- **When OFF:** "Dit aktive løb gemmes ikke undervejs. Mister du forbindelsen eller appen lukker uventet, går dataene tabt."

The box label switches based on the current toggle state, so the user immediately understands what they just chose.

On the home screen, the existing **"Recover unsaved run?"** banner returns — it appears only if a recoverable snapshot was saved and the user hasn't started a new run.

### Files to add (restore)

- `src/lib/flight-recorder.ts` — `localStorage` helpers (`saveSnapshot`, `loadSnapshot`, `clearSnapshot`, `hasRecoverableSnapshot`, `snapshotToRun`) plus `createDebouncedRecorder` for ~1s debounced writes.
- `src/hooks/use-recover-run.ts` — checks the buffer on mount; returns `{ snapshot, save, discard }`.
- `src/components/RecoverRunBanner.tsx` — banner shown on `/` when a snapshot is recoverable.

### Files to edit

- `src/lib/user-profile.ts` — re-add `flightRecorderEnabled?: boolean` to `UserProfile` and `DEFAULT_PROFILE` (default `true`, backwards compatible via `!== false` pattern).
- `src/hooks/use-run-tracker.ts`:
  - Re-import flight-recorder helpers.
  - Add `flightRecorderEnabledRef`, `recorderRef`, and `getRecorder()` back.
  - On `start()`, read the flag, clear any stale snapshot, reset the recorder.
  - On `commitRun()` and `discardRun()`, cancel recorder + clear snapshot.
  - Re-add the `useEffect` that queues a `FlightSnapshot` on every meaningful state change while running/paused.
- `src/routes/profile.tsx`:
  - Add the **Flight Recorder** toggle row (icon `ShieldCheck`) right after the **Auto-pause** row in the existing general settings `<section>`.
  - Directly under that row, render a small info paragraph inside the same section (no new card) that swaps copy based on `profile.flightRecorderEnabled !== false`.
  - Import `ShieldCheck` from `lucide-react`.
- `src/routes/index.tsx` — re-mount `<RecoverRunBanner />` in the idle/finished states (same spot as before).
- `src/lib/i18n.tsx` — re-add the en+da keys:
  - `profile.flightRecorder`, `profile.flightRecorder.on`, `profile.flightRecorder.off`
  - `profile.flightRecorder.info.on`, `profile.flightRecorder.info.off` (the explanation copy)

### Technical details

- Flight recorder buffer key: `orbit:flight-recorder:v1`, shape `{ runId, startedAt, endedAt, durationMs, distanceM, elevationGainM, points, splits, hrSeries, weather?, avgHrBpm?, maxHrBpm?, lastSavedAt }`.
- Debounced writes (~1s) so heavy GPS bursts don't block the main thread.
- Snapshot is considered recoverable if `startedAt` is within the last 24h, has ≥30s of data, and no saved Run with the same `runId` exists.
- All persistence stays client-side in `localStorage` — no backend changes.
- Toggle state respects existing `coachEnabled`-style "missing key = on" convention so existing users default to on.
- Info box uses muted-foreground text inside the glass section (no extra card chrome) so it doesn't visually break the settings list.