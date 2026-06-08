## Fix CSS build + bekræft SPA-only build

### Fund
- `src/styles.css` er kun 373 linjer (ikke 5304). Alle `@import`-regler er allerede øverst (linje 1–6).
- Den faktiske årsag til 500 på `/src/styles.css` er linje 6: `@import url("https://fonts.googleapis.com/...")`. Lightning CSS forsøger at resolve URL'en fra filsystemet og fejler (jf. tailwind4-gotchas: remote `@import` er aldrig gyldig i v4 — fonts skal indlæses via `<link>` i `__root.tsx`).
- `vite.config.ts` har allerede `spa.prerender.enabled = false` og `prerender.enabled = false`. `cloudflare`-option blev fjernet sidste tur.

### Ændringer

1. **`src/styles.css`** — Fjern linje 6 (remote Google Fonts `@import`). Inter og JetBrains Mono er allerede refereret i `@theme inline` (linje 11–12); fonten skal blot indlæses via `<link>`.

2. **`src/routes/__root.tsx`** — Tilføj font-links til `head().links`:
   ```ts
   { rel: "preconnect", href: "https://fonts.googleapis.com" },
   { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
   { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" },
   ```

3. **`vite.config.ts`** — Allerede konfigureret til SPA uden prerender. Ingen ændringer nødvendige; verificeres efter fix.

### Verifikation
- Dev-server's `/src/styles.css` returnerer 200.
- `npm run build` producerer `dist/index.html` uden prerender-fejl.
