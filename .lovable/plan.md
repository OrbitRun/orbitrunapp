## Focus Mode — Locked Running UI

When the user taps "START LØB" (after the countdown completes), the home screen swaps into a **dedicated full-screen Focus view** — no bottom nav, no scroll, no bounce. When the run finishes/stops, we return to the normal idle screen.

### 1. New component: `FocusRunView`

File: `src/components/FocusRunView.tsx`

Receives the `useRunTracker()` instance + handlers (`onPause`, `onResume`, `onStop`) as props from `routes/index.tsx`. Layout is a **fixed full-viewport flex column** using `100dvh`, `overflow: hidden`, `overscroll-behavior: none`, `touch-action: none` on the root, with safe-area padding top/bottom.

```
┌────────────────────────────────┐
│ Ghost bar:  +12m  AHEAD        │  ← top overlay (only if ghost active)
├────────────────────────────────┤
│                                │
│         MAP (flex: 1)          │  ← top half, follows runner
│                                │
│  [▶ ⏸ ⏭]  (mini music overlay) │  ← bottom-left of map
├────────────────────────────────┤
│   00:54:12       3.42 km       │  ← hero stats (huge)
├────────────────────────────────┤
│  ◀ [Pace · 5:10 /km]    ▶      │  ← swipeable carousel (1 at a time)
│      • • ○ ○ ○                 │  ← page dots
├────────────────────────────────┤
│       [Pause]   [Hold Stop]    │
└────────────────────────────────┘
```

### 2. Locked layout & no-scroll behavior

- Root: `fixed inset-0 z-50 flex flex-col bg-background` with `touch-action: none` and `overscroll-behavior: contain` to kill bounce.
- When Focus is active, hide `<BottomNav>` by adding a global flag (CSS class on `<body>`, set/cleared in `FocusRunView`'s `useEffect`). `BottomNav` reads it and returns `null`. This keeps `__root.tsx` untouched structurally.
- Disable `useSwipeNav` while Focus is mounted so left/right swipes don't bounce to history.

### 3. Hero stats (big, high contrast)

Reuse the user's existing `layout.hero` from `stat-metrics`. Render two metrics with `text-[56px]` font weight `font-display font-black`, value in foreground/neon-tinted, label tiny uppercase above. No glow, just bold contrast.

### 4. Swipeable secondary carousel

- Source: `ALL_METRIC_IDS.filter(id => !layout.hero.includes(id))` → ~10 swipeable cards.
- Implementation: a horizontally scrolling flex container with `scroll-snap-type: x mandatory`, each child `w-full snap-center shrink-0`. Uses native touch scroll (no extra dep) — perfectly smooth on mobile.
- Show one large metric per page (label + huge value + unit). Page indicator dots underneath, computed from `scrollLeft / pageWidth`.
- Pre-arrange so the user's existing `layout.secondary` metrics appear first.

### 5. Ghost runner bar (top)

A slim pill at the very top of the Focus view (inside safe area):
- `+0:12 FORAN` (green) when `ghostDeltaMs >= 0`
- `−0:05 BAGUD` (red/destructive) when behind
- Hidden when `t.ghost` is null. Updates live from `t.ghostDeltaMs`.

### 6. Map (top half)

Reuse `<RunMap>` with `interactive={false}` so the map auto-follows. Constrain it to `flex: 1` of the upper region (roughly 45% of viewport). Ghost runner indicator already rendered by `RunMap` via `ghost` prop — keep it.

### 7. Mini music overlay

A compact pill anchored at `absolute bottom-2 left-2` over the map: three buttons (◀ / ▶‖ / ▶) wired to a new lightweight prop-driven version of MusicHub controls — extract the play/skip/state logic into a `useMusicControls()` hook (or a new `<MiniMusicControls>` component) that shares the same `MOCK_TRACKS` + `orbit:run-start/stop` events as `MusicHub`. Glass background, no track title (just controls) to stay minimal.

### 8. Action buttons — Pause + Hold-to-Stop

- **Pause/Resume**: regular tap, same behavior as today.
- **Stop**: long-press required. Implementation:
  - On `pointerdown`: start a 1200ms timer + animate a circular progress ring around the button (SVG `stroke-dashoffset` transition) + light haptic at 600ms.
  - On `pointerup`/`pointerleave` before timer fires: cancel & reset.
  - On timer fire: strong haptic, call `onStop`.
- Add Danish + English strings: `focus.holdToStop` ("Hold for at stoppe" / "Hold to stop").

### 9. Wiring in `routes/index.tsx`

- `isActive = t.status === "running" || t.status === "paused"`.
- If `isActive && !pendingRun`, render `<FocusRunView ... />` instead of the existing scroll layout. Onboarding/countdown/summary overlays still render above (they're already portals/fixed).
- The existing pre-run home (header, coach card, map preview, edit-stats grid, MusicHub, big start button) continues to render in idle/finished states.

### 10. i18n keys to add (`src/lib/i18n.tsx`)

`focus.ghostAhead`, `focus.ghostBehind`, `focus.holdToStop`, `focus.swipeHint` (subtle "Swipe for more" on first run). EN + DA.

### Files to create
- `src/components/FocusRunView.tsx`
- `src/components/MiniMusicControls.tsx`

### Files to edit
- `src/routes/index.tsx` — branch to FocusRunView when active.
- `src/components/BottomNav.tsx` — return `null` when `body.focus-mode` class is present.
- `src/lib/i18n.tsx` — new keys.
- `src/lib/stat-metrics.ts` — small helper `secondaryCarouselOrder(layout)` returning `[...layout.secondary, ...rest]`.

### Out of scope (not requested)
- Real Spotify integration (still mock controls; share state with existing MusicHub).
- Persisting carousel position across pause/resume.
- Background-tab tracking already works via the existing wake lock + silent audio loop + timer worker — no changes needed.
