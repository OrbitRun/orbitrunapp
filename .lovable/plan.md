# Fix: black Mapbox map on Run screen (web + TestFlight)

## Confirmed cause (measured in the running app)

The Mapbox tiles, style, fonts and token are all fine — every Mapbox request
returns 200 in the live preview and the WebGL context is not lost. The problem
is layout: the map's own element has a resolved height of **0px**.

Measured chain on `/` (Run screen):

```text
section.relative.flex.flex-1        375.25px   (flex column)
  div.rounded-3xl.flex-1            375.25px   (height comes from flex-grow, CSS height: auto)
    div.mapboxgl-map (h-full)       0px        <-- 100% of an auto height = 0
      div.mapboxgl-canvas-container 0px
        canvas.mapboxgl-canvas      stale 300px, nothing painted
```

`RunMap` is given `className="h-full w-full"`, i.e. `height: 100%`. Its parent
is a flex item whose height comes from `flex-1`, not from an explicit height,
so the percentage resolves against `auto` and collapses to 0. Mapbox then has
no usable viewport and the card renders as a black box. Same markup on web and
in the iOS build, which is why both look identical.

## The fix

`src/routes/index.tsx` — make the map card a positioning context and let the map
fill it absolutely instead of by percentage:

- Add `relative` to the map card wrapper (`div.rounded-3xl...flex-1 min-h-[160px]`).
- Change the `RunMap` className from `h-full w-full` to `absolute inset-0`.

`src/components/RunMap.tsx` — make the component robust to this class of bug:

- Give the `ClientOnly` fallback and the container the same className so no
  layout shift on hydration (already passes `props.className`).
- Keep the existing `ResizeObserver`, and additionally call `map.resize()` once
  on the next animation frame after `load`, so the first paint happens after the
  flex layout has settled.

No changes to safe-area/viewport CSS, BottomNav, GPS, Spotify, Bluetooth,
Apple Health, `capacitor.config.ts`, or native iOS files.

## Verification

Reload `/` in the preview, skip onboarding, and confirm via measurement that the
`.mapboxgl-map` element has a non-zero height and the map card shows the dark
Mapbox basemap instead of black. Then `npx cap sync ios` before the next Xcode
build.
