import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Capacitor skal bruge en ren statisk SPA-build med index.html direkte i dist.
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        enabled: false,
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
  vite: {
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    environments: {
      client: {
        build: {
          outDir: "dist",
        },
      },
      ssr: {
        build: {
          outDir: "dist/.server",
        },
      },
    },
  },
});
