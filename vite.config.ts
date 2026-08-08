import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Capacitor skal bruge en ren statisk SPA-build med index.html direkte i dist.
  ...({ cloudflare: false } as Record<string, unknown>),
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        enabled: true,
        // TanStack Start appends `.html` to SPA shell outputPath, so `/index`
        // writes exactly `dist/index.html`.
        outputPath: "/index",
        autoSubfolderIndex: false,
        crawlLinks: false,
        retryCount: 0,
      },
    },
    prerender: {
      enabled: true,
      crawlLinks: false,
      failOnError: true,
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
