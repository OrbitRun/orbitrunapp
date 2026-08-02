import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Capacitor skal bruge en ren statisk SPA-build med index.html direkte i dist.
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        enabled: true,
        outputPath: "/index",
        autoSubfolderIndex: false,
        crawlLinks: false,
        retryCount: 0,
      },
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

});
