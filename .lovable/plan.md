## Problem

Auto-pause is enabled in settings but the timer keeps running when the user stops. The "stops" detection never fires because of a dependency-tracking bug in the auto-pause effect.

## Root cause

In `src/hooks/use-run-tracker.ts` (lines 927–981), the auto-pause / auto-resume reactor is a `useEffect` whose dependencies are:

```
[state.status, state.distanceM, state.currentPaceSecPerKm, doPause, doResume]
```

When the runner stops moving:
- GPS positions still arrive, but `state.distanceM` stops changing (no new distance accumulated).
- `state.currentPaceSecPerKm` is set to 0 only after pause, not before.
- So the effect never re-runs while the user is standing still — exactly when it needs to fire `doPause(true)`.

Symmetrically, while auto-paused, distance is frozen, so the auto-resume branch also rarely re-evaluates.

The timer worker already ticks `state.elapsedMs` every 250 ms (line 279). Adding `state.elapsedMs` to the effect's deps makes the reactor run on a steady cadence, so the 10‑second movement-window check actually executes when the user has stopped.

## Change

**`src/hooks/use-run-tracker.ts`** — single edit to the auto-pause effect's dependency array:

- Add `state.elapsedMs` so the effect re-runs on each timer tick (~4 Hz), allowing the stopped-movement check to fire even when GPS distance is no longer changing.

No logic changes — the heuristic itself (distance < 5 m and speed < 0.5 m/s over a 10 s window) already works; it just wasn't being evaluated on stop.

## Verification

- Start a run, walk a few meters, then stand still: auto-pause indicator should appear within ~10 s and the timer should freeze.
- Resume walking >1.2 m/s for 3 s: should auto-resume.
- Manual pause should still NOT auto-resume (gated by `autoPausedRef`).
