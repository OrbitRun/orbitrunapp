# Live PR voice callouts for every category

Today, the per-km voice cue only announces new records for **Fastest km** and **Longest run**. This plan extends live detection to every PR category in the engine: **1 km, 5 km, 10 km, Half marathon, Marathon**, in addition to the existing two.

The existing "PR voice callouts" toggle in Profile continues to mute all of them.

## What changes

When a runner crosses a fixed-distance threshold (e.g. their 5 km point) during the run, the tracker checks if the time it took beats the stored PR for that distance. If yes, the next 1 km voice cue appends a phrase such as:

- EN: "New personal record! Your fastest 5 km ever."
- DA: "Ny rekord! Hurtigste 5 km nogensinde."

If a single voice cue happens to land on multiple new PRs at once (rare — e.g. the runner just hit both a new 5 km and a new longest run), all relevant phrases are appended in order: distance PRs (1k → marathon) → fastest km → longest run.

Live detection uses the same logic as the post-run PR engine (sliding-window best time over the actual GPS trace), so what's announced live matches what gets saved.

## How it sounds

```text
"Great work Casper! Kilometer 5 completed. Split pace 5 minutes 12 seconds per kilometer.
 New personal record! Your fastest 5 km ever.
 New personal record! Your fastest kilometer ever."
```

Cues at non-km boundaries (e.g. the 500 m half-cue) stay unchanged.

## Technical details

1. **`src/lib/personal-records.ts`** — export a small helper `bestTimeForDistanceLive(points, target)` that reuses the existing `bestTimeForDistance` sliding-window logic so the tracker can call it on the live point buffer without duplicating code.

2. **`src/hooks/use-run-tracker.ts`**
   - Replace the `prFlags` shape with a richer one:
     ```ts
     { distances?: PrCategory[]; fastestKm?: boolean; longestDistance?: boolean }
     ```
   - Track which fixed-distance categories have already been announced this run in a new ref `announcedDistancePrsRef = useRef<Set<PrCategory>>(new Set())` (reset in `start()`), so each PR fires at most once per run.
   - In the km-boundary cue block, for every entry in `FIXED_DISTANCES` where `cueDistance >= meters` and not yet announced:
     - Compute `bestTimeForDistanceLive(newPoints, meters)`.
     - Compare against `prMap[category]?.value`. If better (or no record exists), add to `prFlags.distances` and mark announced.
   - Pass the flags to `speakSplit`.

3. **`speakSplit` in `use-run-tracker.ts`** — extend to render the new phrases. Use a small label map for distance names per language:
   - EN: `1k → "1 kilometer"`, `5k → "5 km"`, `10k → "10 km"`, `half → "half marathon"`, `marathon → "marathon"`
   - DA: same but Danish (`"halvmarathon"`, `"maraton"`).
   - Append in fixed order: distances → fastestKm → longestDistance.

4. **No new i18n keys required** — phrases are built inline in `speakSplit` to mirror the existing `fastestKm`/`longestDistance` style.

5. **Settings unchanged** — the existing `prVoiceEnabled` toggle already gates the entire `prFlags` block.

## Files touched

- `src/lib/personal-records.ts` (export live helper)
- `src/hooks/use-run-tracker.ts` (detection + speakSplit phrasing + new ref)
