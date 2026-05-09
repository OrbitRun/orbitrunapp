// SPA build til Capacitor / iOS.
//
// Bruges af `bun run build:ios` (eller `npx vite build --config vite.config.ios.ts`).
// Output: dist/client/index.html + assets — matcher capacitor.config.ts `webDir`.
//
// Forskelle fra den normale SSR-build (vite.config.ts):
//   - cloudflare: false  -> ingen Worker bundle, ren statisk output
//   - tanstackStart.spa  -> genererer en SPA shell index.html, al routing
//                            sker client-side efter hydrering
//
// Server functions (createServerFn) virker IKKE i denne build — de skal kaldes
// over netværket mod en kørende SSR-deploy hvis nødvendigt. Til Capacitor
// taler appen direkte med Supabase via anon key + RLS.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
      prerender: {
        // Generér en statisk index.html (SPA shell) — ingen crawl af loaders.
        enabled: true,
        outputPath: "/index",
        autoSubfolderIndex: false,
        crawlLinks: false,
      },
    },
  },
});
