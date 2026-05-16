## Indoor Focus Run — centered hero + swipable 2×2 grid

Redesign the indoor variant of Focus Run (and its "Klar til start" preview) around a single huge centered metric on top and a swipable 2×2 grid of customizable tiles below. Same visual language as the rest of the app (glass tiles, neon for the hero, muted labels).

### 1. New indoor layout state

Add a tiny persistence module (`src/lib/indoor-layout.ts`):

```ts
export type IndoorLayout = {
  superHero: MetricId;           // tap to switch (cycles pace → hr → speed)
  gridPages: MetricId[][];       // each page = 4 metrics for the 2×2 grid
};

export const DEFAULT_INDOOR_LAYOUT: IndoorLayout = {
  superHero: "pace",
  gridPages: [
    ["hrBpm", "distance", "duration", "cadence"],
    ["speed", "elevation", "calories", "avgPace"],
  ],
};

// loadIndoorLayout() / saveIndoorLayout() in localStorage ("orbit:indoor-layout:v1")
```

Only metrics already in `src/lib/stat-metrics.ts` are used — no new sensors (G-kraft, lap times indoors aren't tracked). The grid is fully user-configurable via long-press, so the defaults just seed sensible pages.

### 2. Rewrite `src/components/IndoorRunView.tsx`

New layout (vertical-centered, no map/card):

```text
┌────────────────────────────────────┐
│  SourceSignalChip            (top) │
│                                    │
│            PACE · MIN/KM           │  ← label, muted
│              5:24                  │  ← huge, #CCFF00, tap-to-change
│                                    │
│  ┌────────┐  ┌────────┐            │  ← 2×2 grid, swipable horizontally
│  │  HR    │  │  DIST  │            │     numbers white/foreground
│  │  152   │  │  3.2   │            │     long-press any tile → MetricPicker
│  ├────────┤  ├────────┤            │
│  │ TIME   │  │ CAD    │            │
│  │ 17:42  │  │ 178    │            │
│  └────────┘  └────────┘            │
│            • ●                     │  ← page dots
│                                    │
│  MusicHubFull                      │
│  [pause]   [hold-to-stop]          │
└────────────────────────────────────┘
```

Implementation notes:
- Outer container becomes `flex-1 flex flex-col justify-center` so the hero + grid block sits vertically centered; controls + music are pushed to the bottom with `mt-auto`.
- **Super hero block**: `text-[96px] text-neon` value, `text-[10px] uppercase tracking-[0.3em] text-muted-foreground` label. Wrapped in a `<button>` that cycles the metric through `["pace", "hrBpm", "speed"]` on tap and persists via `saveIndoorLayout`.
- **Swipable grid**: a horizontal scroller (`flex overflow-x-auto snap-x snap-mandatory no-scrollbar touch-action:pan-x`). Each page is a `grid grid-cols-2 grid-rows-2 gap-3` filling the carousel width. On scroll, update a `page` state from `scrollLeft / clientWidth` to drive the dots.
- **Page dots**: same style already used in FocusRunView (`h-1 rounded-full`, active = `w-4 bg-neon`, idle = `w-1 bg-white/25`). A small "+" dot button on the right of the dots adds a new empty page (optional, defaults to 2 pages).
- **Tile component** (`Tile`): same glass card (`rounded-2xl bg-white/5 border border-white/10 p-4`), label muted, value `text-foreground` (white/light), unit muted. Long-press (≥600 ms, with haptic) opens the existing `MetricPicker` with the tapped tile's current metric pre-selected and the `used` array = all hero+grid metrics so duplicates are blocked. Selecting an option swaps the metric for that tile and persists.

### 3. Static "Klar til start" preview (`src/routes/index.tsx`)

Replace the placeholder card in the `profile.activityEnvironment === "indoor"` branch (currently the small `indoor.preview.title/hint` block, ~lines 245–254) with a read-only mirror of the new indoor layout: same super hero label + value (rendered as `—:—` since no run is active), same 2×2 grid on the active page from the saved layout, same page dots. No tap / long-press — purely visual confirmation of the setup.

The map / legend / SourceSignalChip stays unchanged in the outdoor branch.

### 4. Color rules

- Super hero value: always `text-neon` (already the `--neon` token = #CCFF00 equivalent).
- 2×2 grid values: `text-foreground` (white/light grey).
- All labels: `text-muted-foreground` uppercase tracking, font-bold, `text-[10px]`.
- No `glow-neon` / `shadow-neon` anywhere — keep the flat look used elsewhere now.

### 5. i18n keys to add (`src/lib/i18n.tsx`)

- `indoor.tapToChange` — "Tap to change" / "Tryk for at skifte"
- `indoor.holdToCustomize` — "Hold to customize" / "Hold for at tilpasse"

### Out of scope

- No new metric definitions (G-kraft, lap times). Long-press lets the user pick any existing metric.
- Outdoor Focus Run, history, run summary — untouched.