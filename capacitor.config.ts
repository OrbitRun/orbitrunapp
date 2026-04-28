// Capacitor config — used only when the web app is wrapped in a native iOS
// shell (see docs/IOS_SETUP.md). Has no effect on the web build.
import type { CapacitorConfig } from "@capacitor/cli";

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
