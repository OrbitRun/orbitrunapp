import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Standalone static SPA build for Capacitor / native iOS.
// No TanStack Start plugin, no SSR, no prerender, no server functions:
// the app is mounted client-side by src/capacitor-entry.tsx into #root.
export default defineConfig({
  plugins: [tsconfigPaths(), react(), tailwindcss()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.capacitor.html"),
    },
  },
});
