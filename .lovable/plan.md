## Disable prerender/SSR for Capacitor SPA build

`npm run build` crasher fordi TanStack Start's prerender-crawler forsøger at SSR-rendere komponenter, der bruger Capacitor/native APIs. Til iOS/Android-pakning skal appen være en ren statisk SPA med `dist/index.html`.

### Status
- `vite.config.ts` har allerede `spa.prerender.enabled = false` og `prerender.enabled = false`.
- `scripts/prepare-capacitor-build.mjs` har allerede fallback fra `_shell.html` eller en hvilken som helst `.html` til `dist/index.html`.

Men prerender-crawleren kan stadig blive trigget hvis `spa.enabled = true` aktiverer den implicit, eller hvis crawleren stadig forsøger at evaluere routes ved build-tid.

### Ændringer

1. **`vite.config.ts`** — Sørg for at SPA-shell genereres uden at crawle routes:
   - Behold `spa.enabled = true` + `maskPath: "/"` så `_shell.html` produceres.
   - Bekræft begge `prerender.enabled = false` (allerede sat).
   - Tilføj `spa.prerender.crawlLinks = false` og `retryCount = 0` (allerede sat) — verificér.
   - Hvis crawleren stadig kører ved `enabled: false`, fjern hele `prerender`-blokken under `spa` så ingen prerender-pipeline initialiseres.

2. **`scripts/prepare-capacitor-build.mjs`** — Allerede robust med fallback-kæde (`dist/index.html` → `dist/_shell.html` → første `.html` i `dist/`). Ingen ændringer nødvendige; verificér kun ved at køre build.

3. **Build script** — Verificér at `package.json`'s `build`-script kører `vite build && node scripts/prepare-capacitor-build.mjs` (eller tilsvarende), så fallback-scriptet altid kører efter Vite.

4. **Verifikation** — Kør `npm run build` og bekræft:
   - Ingen `createRootRoute is not defined` fejl.
   - `dist/index.html` eksisterer og indeholder SPA-shell med `<div id="root">` + script-tags.
   - Derefter `npx cap sync ios` og reinstaller fra Xcode.

### Hvis fejlen stadig opstår

Hvis `vite build` selv med `prerender.enabled = false` stadig kalder crawleren (kendt issue i nogle TanStack Start-versioner), fald tilbage til den eksisterende `vite.config.ios.ts` (allerede i repo) og brug den eksplicit til Capacitor-builds via en separat npm-script: `vite build --config vite.config.ios.ts`. Det isolerer Capacitor-builden fra den almindelige web-build.

### Forventet resultat
Ren statisk `dist/index.html` uden SSR/prerender, klar til Capacitor wrap til iOS og Android.
