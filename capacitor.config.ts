// Capacitor config — used only when the web app is wrapped in a native iOS
// shell (see docs/IOS_SETUP.md). Has no effect on the web build.
// `@capacitor/cli` is intentionally not in the web package.json — install it
// locally before running `npx cap` commands.
//
// Final export checklist (run locally before opening Xcode):
//   npm install
//   npm run build:ios     # builds SPA, syncs iOS, applies + verifies templates
//   npx cap add ios       # first time only
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
    // IMPORTANT: keep the global fetch/XHR patch OFF. When enabled,
    // CapacitorHttp returns base64 strings instead of ArrayBuffers for
    // binary XHR responses, which breaks Mapbox GL vector-tile decoding
    // in its Web Worker → black map on iOS. Our explicit
    // `CapacitorHttp.request(...)` calls in `src/lib/native-http.ts`
    // already bypass WKWebView CORS for Spotify / Open-Meteo without
    // needing the global patch.
    CapacitorHttp: { enabled: false },
    // Native resize keeps the WKWebView layout in sync with the keyboard so
    // the UI stays interactive after it closes. No auto-focus anywhere.
    Keyboard: {
      resize: "native",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
