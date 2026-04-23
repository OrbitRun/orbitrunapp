
## Fix app icon to match in-app logo (neon green on dark background)

The current app launcher icons (`icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png`, `favicon.ico`) were generated directly from the uploaded PNG, which doesn't have the neon green + dark background treatment used inside the app. I'll regenerate all icons so they match the in-app branding.

### Design

- **Background**: solid dark `#0a0d12` (matches `theme_color` / `background_color` in manifest and app shell)
- **Logo mark**: neon green (`#C6F432` — the `--neon` token used throughout the app)
- **Padding**: ~12% safe-area padding around the mark so iOS/Android rounded-corner masks don't clip it
- **Shape**: full-bleed square (the OS applies its own rounded mask)

### Implementation steps

1. **Build a recolored master PNG** from `src/assets/5ceb6f47-d99d-4cc8-8db5-fe46db27659c.png`:
   - Extract the logo silhouette (alpha channel)
   - Recolor opaque pixels to neon green `#C6F432`
   - Composite onto a dark `#0a0d12` square with ~12% padding
   - Produce a 1024×1024 master via ImageMagick

2. **Generate all required sizes** from the master:
   - `public/icon-192.png` (192×192) — Android / PWA
   - `public/icon-512.png` (512×512) — Android / PWA
   - `public/apple-touch-icon.png` (180×180) — iOS home screen
   - `public/favicon-32.png` (32×32) — browser tab
   - `public/favicon.ico` (multi-size 16/32/48) — legacy favicon

3. **Update `public/safari-pinned-tab.svg` color binding**: keep the monochrome SVG silhouette as-is (Safari requires monochrome), but update the `mask-icon` color in `src/routes/__root.tsx` from `#0a0d12` to `#C6F432` so Safari renders the pinned tab in neon green.

4. **No manifest changes needed** — `background_color` and `theme_color` are already `#0a0d12`, which matches the new icons.

### Files touched

- Regenerated: `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`, `public/favicon-32.png`, `public/favicon.ico`
- Edited: `src/routes/__root.tsx` (mask-icon color → `#C6F432`)

### QA

After generation I'll inspect each PNG to confirm: neon-green mark, dark background, mark centered with safe padding, no clipping, no transparency bleed.
