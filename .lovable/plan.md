# App Store Ready — Final Polish

A focused pass to make ORBIT LAB feel like a native installed app. No new features — only behavior, styling, manifest, and cleanup.

## 1. Native Mobile Feel

**Disable overscroll bounce (global)**
- In `src/styles.css`, add to `html, body`:
  - `overscroll-behavior: none;`
  - `-webkit-overflow-scrolling: auto;` (kills iOS rubber-band)
  - `touch-action: manipulation;` (removes 300ms tap delay, blocks double-tap zoom)

**Touch optimization**
- Add a global utility in `styles.css`:
  - `button, a, [role="button"] { -webkit-tap-highlight-color: transparent; user-select: none; }`
  - `.tap { transition: transform 120ms ease, opacity 120ms ease; }` `.tap:active { transform: scale(0.96); opacity: 0.85; }`
- Audit `hover:` classes in mobile-only surfaces (`src/routes/profile.tsx`, `src/routes/history.tsx`, `src/routes/index.tsx`, `src/routes/records.tsx`): wrap mobile-irrelevant hover styles in `@media (hover: hover)` by replacing `hover:` with `md:hover:` where appropriate, or convert to `active:` feedback. Shadcn primitives (`button.tsx`, `badge.tsx`, etc.) keep `hover:` since they use `@media (hover: hover)` semantics implicitly through Tailwind variants — leave those alone.
- Ensure every interactive button has `active:scale-95` or the new `.tap` class for visual press feedback.

**Safe area insets**
- `src/routes/__root.tsx` `<body>` — add `min-h-[100dvh]` and inline `paddingTop: env(safe-area-inset-top)` is currently only on `index.tsx`. Apply consistently across all routes by adding a wrapper in `__root.tsx` that pads top + bottom with `env(safe-area-inset-*)`.
- `BottomNav.tsx` already uses `pb-[max(env(safe-area-inset-bottom),12px)]` — verify the `mb-[30px]` on the root container in `__root.tsx` doesn't fight it; reduce to rely on safe-area only.
- `FocusRunView.tsx` already uses safe-area padding — keep.

## 2. Clean UI & Navigation

**Z-index hierarchy** — establish a clear scale:
- Base content: default
- BottomNav: `z-40`
- Overlays/modals (Onboarding, Countdown, RunSummary, MetricPicker): `z-50`
- **FocusRunView: bump from `z-40` → `z-[60]`** so it covers the nav even before the MutationObserver-based hide kicks in (avoids a 1-frame flicker).

**Loading states**
- Add a small reusable `<OrbitSpinner />` in `src/components/OrbitSpinner.tsx`: a 24px lime-green orbit ring with `animate-spin`. Use it in:
  - `RecoveryInsight.tsx` while computing
  - `MusicHub.tsx` `busy` state (currently no visual)
  - `WeatherBadge.tsx` if it has a fetching window

**Global cleanup**
- Remove `console.error` calls in:
  - `src/components/ShareSheet.tsx` (lines 51, 92)
  - `src/lib/share-card-v2.ts` (line 76)
  - Replace with silent fail (already wrapped in try/catch).
- Scan for any "TODO", "test", or unused buttons. Confirm none remain.

## 3. Performance & Caching

**Icons**
- The app uses `lucide-react` everywhere — already SVG. ✓ No change needed.
- The logo (`src/assets/5ceb6f47-...png`) stays as PNG (it's a raster brand mark). Note in plan: leave as-is unless an SVG version is supplied.

**Local storage robustness**
- Audit all `localStorage` writes (`user-profile.ts`, `stat-metrics.ts`, `personal-records.ts`, `ghost-runner.ts`, `shoes.ts`, `coach-plan.ts`):
  - Wrap every `JSON.parse` in try/catch returning defaults (most already do).
  - Add a versioned key check so future schema changes don't crash hydration.
- Add a `src/lib/storage.ts` helper with `safeGet<T>(key, default)` / `safeSet(key, value)` and migrate the most critical files (profile, layout, PRs) to use it.

## 4. App Manifest & Icons

**Update `public/manifest.webmanifest`**:
```json
{
  "name": "ORBIT LAB",
  "short_name": "ORBIT",
  "description": "Premium GPS running tracker with live splits, ghost runner, and Spotify control.",
  "background_color": "#000000",
  "theme_color": "#0a0d12",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "scope": "/",
  "categories": ["health", "fitness", "sports"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**iOS / Android meta tags** in `src/routes/__root.tsx` `head().meta`:
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-mobile-web-app-title: ORBIT`
- `mobile-web-app-capable: yes`
- `format-detection: telephone=no`
- Update `theme-color` to `#000000` to match manifest background for a seamless splash.

Note: per Lovable PWA guidance we are NOT adding service workers / vite-plugin-pwa. Manifest + meta tags are enough for "Add to Home Screen" installability without offline caching (which would break the in-editor preview).

## 5. Final Logic Check

**Coach as source of truth for goal progress**
- Audit `src/components/CoachCard.tsx` and `src/lib/coach-plan.ts`: confirm goal progress reads from `profile.coach.goal` (with `fasterDistance`) before falling back to `profile.goal`. Already implemented in `coachGoalLabel()` in `index.tsx` — verify all other surfaces (history page weekly target, records page) follow the same precedence.

**High-precision GPS + path smoothing**
- Already verified in `use-run-tracker.ts`:
  - `enableHighAccuracy: true`, `maximumAge: 0`, `timeout: 5000` ✓
  - Accuracy gate (≤20m), movement floor (3m / acc×0.4), max-speed reject (10 m/s), elevation EMA (0.7/0.3) ✓
  - Split boundary interpolation ✓
- No code change needed — call out as "already active" in the implementation summary so the user has confirmation.

## Files Touched

- `public/manifest.webmanifest` — full rewrite
- `src/routes/__root.tsx` — meta tags, safe-area wrapper, theme-color
- `src/styles.css` — overscroll, tap-highlight, `.tap` utility
- `src/components/FocusRunView.tsx` — `z-[60]`
- `src/components/OrbitSpinner.tsx` — NEW
- `src/components/MusicHub.tsx` — spinner in busy state
- `src/components/ShareSheet.tsx` — strip console.error
- `src/lib/share-card-v2.ts` — strip console.error
- `src/lib/storage.ts` — NEW safe storage helpers
- `src/lib/user-profile.ts`, `src/lib/stat-metrics.ts`, `src/lib/personal-records.ts` — adopt safe storage
- `src/routes/profile.tsx`, `src/routes/history.tsx`, `src/routes/records.tsx` — gate hover styles behind `md:hover:` / convert to `active:`

## Out of Scope

- Service workers / offline mode (would break Lovable preview)
- Replacing the PNG logo with SVG (no SVG asset supplied)
- New features or layout changes
