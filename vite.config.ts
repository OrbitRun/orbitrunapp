import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Capacitor skal bruge en ren statisk web-build med index.html direkte i dist.
  cloudflare: false,
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
      prerender: {
        enabled: true,
        outputPath: "/index",
        autoSubfolderIndex: false,
        crawlLinks: false,
      },
    },
    prerender: {
      enabled: true,
      crawlLinks: false,
      failOnError: true,
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
      server: {
        build: {
          outDir: "dist/.server",
        },
      },
    },
  },
});
