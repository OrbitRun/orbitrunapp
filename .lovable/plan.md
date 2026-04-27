## Orbit Share Image Generator

Build a refined 1:1 share card with two background modes (Map or Photo), minimalist data overlay, and native share — added to the run detail page in Historik.

### Where it lives

- **Trigger button** on `src/routes/run.$id.tsx` — a single "Del mit løb" button placed below the hero distance card. The existing oversized share card on `RunSummary` (post-run) is replaced with the same new component for consistency.
- The current `src/lib/share-card.ts` (story-format 1080×1920 with PR panel) stays in place but is no longer wired in. We can keep it for later or delete after approval; default plan: delete to avoid dead code.

### Flow

1. Tap "Del mit løb" → opens a bottom sheet with two background tabs:
   - **Kort** — dark Mapbox snapshot with the route in neon-green (default).
   - **Foto** — file picker (`<input type="file" accept="image/*">`) for a photo from the run.
2. Live 1:1 preview at the top of the sheet, regenerated when the user switches tabs / picks a photo.
3. Bottom action: "Del" → calls Web Share API with the generated PNG, falls back to download.

### Card design (1080×1080)

- **Top-left:** "ORBIT LAB" wordmark, small caps, tracked, white at 90%.
- **Center:** distance — huge bold number (e.g. `10.5`) + small `km` label. White, no glow.
- **Bottom-left:** time (mono, white).
- **Bottom-right:** pace + `min/km` (mono, white).
- **PR pill** (optional, top-right): tiny outlined "PR" if `previewRunPrs(run)` returns any.
- Background:
  - Map: rendered via Mapbox Static Images API (`/styles/v1/mapbox/dark-v11/static/path-...`) so we get the real basemap baked into the PNG. Path encoded with `@mapbox/polyline` (already trivial to inline).
  - Photo: drawn into canvas with `object-fit: cover` math, then a bottom-anchored vertical gradient overlay (transparent → rgba(0,0,0,0.65)) for legibility. Top-left also gets a smaller gradient behind the wordmark.
- Strictly no glow / no neon halo. Neon only used for the route polyline on the map background.

### Technical notes

- New file `src/lib/share-card-v2.ts` exports `generateShareCard(run, { mode, photoDataUrl }, lang)` returning a `Blob`, plus `shareBlob(blob, lang)` for Web Share + download fallback.
- Map mode uses Mapbox Static Images:
  - URL: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/path-5+c8ff3d-1({encodedPolyline})/auto/1080x1080@2x?access_token=...&padding=80`
  - Token already in `src/lib/mapbox.ts`.
  - Fetched as blob, drawn to canvas, then text overlay drawn on top.
  - Fallback: if fetch fails or the run has <2 points, render a flat dark background with the polyline projected by hand (reuse the `project()` helper pattern from existing `share-card.ts`).
- Photo mode: read file via `URL.createObjectURL`, load into `Image`, draw cover-fit, apply gradients, draw text.
- New component `src/components/ShareSheet.tsx` (uses existing `Sheet` UI primitive) hosts the tabs, preview, file input, and share button.
- `src/components/RunSummary.tsx` and `src/routes/run.$id.tsx` both mount `ShareSheet` and pass the `run`.
- i18n keys added in `src/lib/i18n.tsx`: `share.button`, `share.title`, `share.tabMap`, `share.tabPhoto`, `share.pickPhoto`, `share.share`, `share.downloaded`, `share.generating`.

### Files

- new: `src/lib/share-card-v2.ts`
- new: `src/components/ShareSheet.tsx`
- edit: `src/routes/run.$id.tsx` — add share button + sheet
- edit: `src/components/RunSummary.tsx` — replace inline share button with `ShareSheet`
- edit: `src/lib/i18n.tsx` — add share keys (da + en)
- delete: `src/lib/share-card.ts` (replaced)
