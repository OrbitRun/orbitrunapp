import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Dedicated config for the Capacitor/iOS build: no SPA-shell prerender, no
// preview-server plugin work — just a clean static client bundle that
// scripts/prepare-capacitor-build.mjs turns into dist/index.html.
export default defineConfig({
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
