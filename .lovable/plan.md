## Fix Capacitor iOS build

The `npm run build` fails during prerender with `createRootRoute is not defined`, which prevents `dist/index.html` from being generated and breaks `npx cap sync ios`.

### Changes

1. **`vite.config.ts`** — Disable both prerender configs:
   - Set `tanstackStart.spa.prerender.enabled = false`
   - Set `tanstackStart.prerender.enabled = false`
   - Keep the rest of the SPA config (maskPath, outputPath) intact so the shell HTML is still emitted.

2. **`scripts/prepare-capacitor-build.mjs`** — Add a fallback chain so the script doesn't hard-fail when prerender is off:
   - After existing `dist/client` flattening, if `dist/index.html` still missing:
     a. Copy `dist/_shell.html` → `dist/index.html` if present.
     b. Otherwise, scan `dist/` for any `.html` file and copy the first match to `dist/index.html`.
   - Only throw if none of the above succeed.

3. **`src/routes/__root.tsx`** — Verify the import line is exactly `import { useGpsWarmup } from "@/hooks/use-gps-warmup";` (no `GpsDebugOverlay`) and that `useGpsWarmup()` is called in `RootComponent` next to `useHealthAutoSync()` / `useSpotifyRunControl()`. Already in place per current file — confirm and leave as-is.

4. **`src/hooks/use-gps-warmup.ts`** — Verify it only exports `useGpsWarmup` and contains no JSX / React components. Already matches per current file — confirm and leave as-is.

### Post-fix verification

Run `npm run build` and confirm `dist/index.html` exists. Then `npx cap sync ios` and reinstall from Xcode.
