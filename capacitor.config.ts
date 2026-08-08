// Capacitor config — used only when the web app is wrapped in a native iOS
// shell (see docs/IOS_SETUP.md). Has no effect on the web build.
// `@capacitor/cli` is intentionally not in the web package.json — install it
// locally before running `npx cap` commands.
//
// Final export checklist (run locally before opening Xcode):
//   npm install
//   npm run build         # produces dist/index.html (matches webDir)
//   npx cap add ios       # first time only
//   npx cap sync ios      # every time the web app changes
//   npx cap open ios      # Archive → TestFlight
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  urlSchemes?: string[];
  ios?: {
    contentInset?: "always" | "automatic" | "never" | "scrollableAxes";
    scrollEnabled?: boolean;
  };
  plugins?: Record<string, unknown>;
};

const config: CapacitorConfig = {
  appId: "com.orbitrun.app",
  appName: "Orbit Run",
  webDir: "dist",
  urlSchemes: ["jonas-orbit-run"],
  ios: {
    contentInset: "never",
    scrollEnabled: true,
  },
  plugins: {
    // Patch window.fetch / XMLHttpRequest to use the native HTTP bridge on
    // iOS. This bypasses WKWebView CORS restrictions and the "DownloadFailed"
    // sandbox extension errors that Spotify/Open-Meteo trigger from inside
    // the capacitor://localhost origin.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
