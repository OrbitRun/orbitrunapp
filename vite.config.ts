import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Web-deployment kører SSR. SPA-shell/prerender er slået fra, fordi
  // prerender-crawleren leder efter dist/server/server.js (findes ikke i
  // dette nitro-output). Capacitor bygges med vite.config.ios.ts.
  tanstackStart: {
    spa: {
      enabled: false,
    },
    prerender: {
      enabled: false,
      crawlLinks: false,
      failOnError: false,
      autoStaticPathsDiscovery: false,
    },
    sitemap: {
      enabled: false,
    },
  },
  vite: {
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  },

});
