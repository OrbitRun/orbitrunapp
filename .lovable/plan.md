# Run screen: spacing, blank map, legend

Three scoped visual changes. No shell, safe-area, contentInset, BottomNav, GPS/tracking or native file changes.

## 1. Spacing around START LØB

`src/routes/index.tsx`, the control section (currently `mt-4 flex items-center justify-center gap-4`):

- Gap above the button today: 16px (`mt-4`).
- Gap below: only the shell's 8px reserve before BottomNav — visibly tighter.

Change: keep `mt-4` and add `mb-2` (8px) so the total space below becomes 8 + 8 = 16px, matching the 16px above. BottomNav anchoring and the global shell padding stay untouched.

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
