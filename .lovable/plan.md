# Run screen: spacing, blank map, legend

Three scoped visual changes. No shell sizing, safe-area model, contentInset, nav height, GPS/tracking or native file changes.

## 1. BottomNav gap + spacing around START LØB

`src/components/BottomNav.tsx`: the fixed nav currently uses `pb-[calc(env(safe-area-inset-bottom)+8px)]`. Reduce the intentional gap to 4px — `pb-[calc(env(safe-area-inset-bottom)+4px)]` — so the pill sits slightly lower, still fully clear of the iOS home indicator. Nav height, structure and styling unchanged.

`src/routes/index.tsx`, the control section (currently `mt-4 flex items-center justify-center gap-4`):

- With the nav 4px lower, the space below START LØB becomes the shell's 8px reserve + 4px = 12px.
- Change `mt-4` to `mt-3` (12px) so the gap above the button matches the 12px below.

Global shell padding (`--orbit-nav-h` and the shell bottom reserve) stays exactly as it is.


## 2. Blank Mapbox map

Cause: `RunMap` creates the Mapbox instance once on mount and never calls `map.resize()`. Since the new layout puts the map in a `flex-1` container whose height is resolved after/independently of mount, mapbox-gl can capture a 0-height (or stale-height) canvas and never repaints — the container is visible, the WebGL canvas is not.

Fix in `src/components/RunMap.tsx` only:

- Call `map.resize()` once on the `load` event (right where `setReady(true)` happens).
- Attach a `ResizeObserver` on the map container that calls `map.resize()` whenever the container box changes, disconnected on cleanup.

This preserves container size, layout, styling, data and GPS logic; it only makes the canvas track its flexible container.

## 3. Remove lav / mid / høj legend

`src/routes/index.tsx`: delete the absolutely positioned legend block inside the map section (the `absolute bottom-3 right-3 glass …` div rendering `map.legend.slow` / `map.legend.mid` / `map.legend.fast` with the three color pills). Route coloring logic, `--speed-*` tokens and the separate replay legend in `RunMap` remain untouched.

## Verification

Run `git diff --name-only` (expected: `src/routes/index.tsx`, `src/components/RunMap.tsx`) and report the three items separately: spacing, map resize cause/fix, legend removal.
