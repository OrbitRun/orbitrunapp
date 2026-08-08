#!/usr/bin/env node
// Kopierer templates/Info.plist ind i ios/App/App/Info.plist efter
// `npx cap add ios`. Sikrer at GPS / Spotify / Health / Motion / BLE
// permissions altid er korrekte uden manuel Xcode-redigering.
//
// Kør:  node scripts/apply-ios-template.mjs
// Skal køres EFTER `npx cap add ios` og FØR `npx cap sync ios`.

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
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
console.log(`  Kør nu: npx cap sync ios`);
