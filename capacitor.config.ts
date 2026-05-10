// Capacitor config — used only when the web app is wrapped in a native iOS
// shell (see docs/IOS_SETUP.md). Has no effect on the web build.
// `@capacitor/cli` is intentionally not in the web package.json — install it
// locally before running `npx cap` commands.
//
// Final export checklist (run locally before opening Xcode):
//   bun install
//   npm run build         # produces dist/index.html (matches webDir)
//   npx cap add ios       # first time only
//   npx cap sync ios      # every time the web app changes
//   npx cap open ios      # Archive → TestFlight
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  ios?: {
    contentInset?: "always" | "automatic" | "never" | "scrollableAxes";
    scrollEnabled?: boolean;
  };
};

const config: CapacitorConfig = {
  appId: "com.orbitrun.app",
  appName: "Orbit Run",
  // Standard SPA build outputs index.html directly in dist for Capacitor.
  webDir: "dist",
  ios: {
    contentInset: "always",
    // Disable WKWebView rubber-banding/overscroll so the user can't drag
    // the page down and reveal the native background. Internal scrollable
    // containers (`.app-scroll`) still scroll normally.
    scrollEnabled: false,
    // Purpose strings live in ios/App/App/Info.plist — Capacitor cannot
    // inject Info.plist keys from this file. See docs/IOS_SETUP.md for the
    // full list (Health, Location, Motion, Bluetooth + UIBackgroundModes).
    //
    // Custom URL scheme for Spotify OAuth callback (`jonas-orbit-run://callback`)
    // is also declared in Info.plist via CFBundleURLTypes — see §5 of
    // docs/IOS_SETUP.md. Using a unique scheme (not `capacitor://`) avoids
    // collisions with other Capacitor apps on the same device.
  },
};

export default config;
