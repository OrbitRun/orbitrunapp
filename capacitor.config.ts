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
  appId: "app.lovable.orbit",
  appName: "Orbit Lab",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    // NSHealthShareUsageDescription must be set in ios/App/App/Info.plist
    // — Capacitor cannot inject Info.plist keys from this file.
    // Suggested copy:
    //   "Orbit reads your heart rate during runs to show live BPM and
    //    save it alongside your route."
  },
};

export default config;
