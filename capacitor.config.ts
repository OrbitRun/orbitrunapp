// Capacitor config — used only when the web app is wrapped in a native iOS
// shell (see docs/IOS_SETUP.md). Has no effect on the web build.
// `@capacitor/cli` is intentionally not in the web package.json — install it
// locally before running `npx cap` commands.
//
// Final export checklist (run locally before opening Xcode):
//   bun install
//   bun run build         # produces dist/client (matches webDir)
//   npx cap add ios       # first time only
//   npx cap sync ios      # every time the web app changes
//   npx cap open ios      # Archive → TestFlight
type CapacitorConfig = {
  appId: string;
  appName: string;
  webDir: string;
  ios?: { contentInset?: "always" | "automatic" | "never" | "scrollableAxes" };
};

const config: CapacitorConfig = {
  appId: "com.orbitrun.app",
  appName: "Orbit Run",
  // TanStack Start's Vite build outputs to dist/client — do NOT change to "dist".
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    // Purpose strings live in ios/App/App/Info.plist — Capacitor cannot
    // inject Info.plist keys from this file. See docs/IOS_SETUP.md for the
    // full list (Health, Location, Motion, Bluetooth + UIBackgroundModes).
    //
    // Custom URL scheme for Spotify OAuth callback (`orbitrunapp://callback`)
    // is also declared in Info.plist via CFBundleURLTypes — see §5 of
    // docs/IOS_SETUP.md. Using a unique scheme (not `capacitor://`) avoids
    // collisions with other Capacitor apps on the same device.
  },
};

export default config;
