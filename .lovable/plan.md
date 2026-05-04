## Use the round ORBIT RUN logo on dark background for the web app icon

When users save the app to their home screen (iOS "Add to Home Screen" or Android PWA install), the launcher icon should be the round ORBIT RUN logo centered on the app's dark background — matching the splash screen — instead of the current icons.

### What changes

Regenerate the PWA / home-screen icon set from the round logo (`src/assets/08a0cc02-81da-4cc6-89d2-2c567d41b102.png`) composited onto the app's dark background (`#0a0d12`, the existing `theme_color` in the manifest), with the logo sized to ~70% of the canvas and centered.

Files regenerated in `public/`:
- `icon-192.png` (192×192) — Android home screen
- `icon-512.png` (512×512) — Android splash / high-DPI
- `apple-touch-icon.png` (180×180) — iOS "Add to Home Screen". Must be opaque on dark bg (iOS does not respect transparency and would otherwise show a black square with the logo on top — which is fine here, but we want a controlled, branded look).
- `favicon-32.png` (32×32) and `favicon.ico` — browser tab

`public/manifest.webmanifest` already lists these icons including a `maskable` variant. We keep the same filenames so no manifest edits are required; the maskable 512 entry will work because the logo sits well within the safe zone (~70% of canvas).

### Technical notes

- Generate with a small Node script using the `sharp` package run via `npx` in `code--exec` (sharp is not added as a project dependency — it's only used at generation time, never imported by app code, so the Worker runtime is unaffected).
- Background fill: solid `#0a0d12` (matches manifest `theme_color` and the splash screen's dark canvas).
- Logo: contained at ~70% of each canvas, centered, preserving aspect ratio.
- After generation, QA each PNG by inspecting dimensions and a quick visual check.

### Caveat about already-installed PWAs

Per platform behavior, iOS and Android cache the home-screen icon at install time. Existing installs will keep the old icon until the user removes and re-adds the app. New installs (and fresh browser tabs for the favicon) will pick up the new icons immediately.

### Files

- Edit (regenerate): `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon-32.png`, `public/favicon.ico`
- No code or manifest changes needed.