#!/usr/bin/env node
// Kopierer templates/Info.plist ind i ios/App/App/Info.plist efter
// `npx cap add ios`. Sikrer at GPS / Spotify / Health / Motion / BLE
// permissions altid er korrekte uden manuel Xcode-redigering.
//
// Kør:  node scripts/apply-ios-template.mjs
// Skal køres EFTER `npx cap add ios` og FØR `npx cap sync ios`.

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const src = resolve(root, "templates/Info.plist");
const dest = resolve(root, "ios/App/App/Info.plist");

if (!existsSync(src)) {
  console.error(`✗ Mangler ${src}`);
  process.exit(1);
}
if (!existsSync(dirname(dest))) {
  console.error(`✗ ios/App/App/ findes ikke. Kør 'npx cap add ios' først.`);
  process.exit(1);
}

mkdirSync(dirname(dest), { recursive: true });
copyFileSync(src, dest);
console.log(`✓ Info.plist skrevet til ${dest}`);

// --- App icon -------------------------------------------------------------
// Skriver resources/ios/AppIcon-1024.png ind i asset-kataloget som single-size
// icon (Xcode 14+ genererer selv alle mindre størrelser). Dermed får
// TestFlight/App Store automatisk Orbit Run-logoet som app icon.
const iconSrc = resolve(root, "resources/ios/AppIcon-1024.png");
const iconSetDir = resolve(root, "ios/App/App/Assets.xcassets/AppIcon.appiconset");

if (!existsSync(iconSrc)) {
  console.warn(`! Mangler ${iconSrc} — app icon blev ikke opdateret.`);
} else {
  mkdirSync(iconSetDir, { recursive: true });
  // Ryd gamle placeholder-ikoner så kun 1024-versionen bruges.
  for (const f of readdirSync(iconSetDir)) {
    if (f.endsWith(".png")) rmSync(resolve(iconSetDir, f));
  }
  copyFileSync(iconSrc, resolve(iconSetDir, "AppIcon-512@2x.png"));
  writeFileSync(
    resolve(iconSetDir, "Contents.json"),
    JSON.stringify(
      {
        images: [
          { filename: "AppIcon-512@2x.png", idiom: "universal", platform: "ios", size: "1024x1024" },
        ],
        info: { author: "xcode", version: 1 },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`✓ App icon skrevet til ${iconSetDir}`);
}
console.log("  Kør nu: npx cap sync ios");
