#!/usr/bin/env node
// Kopierer templates/Info.plist ind i ios/App/App/Info.plist og installerer det
// native OrbitGeo-plugin (CLLocationManager baggrunds-GPS) i Xcode-projektet.
//
// Kør:  node scripts/apply-ios-template.mjs
// Skal køres EFTER `npx cap add ios` og FØR `npx cap sync ios`.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const appDir = resolve(root, "ios/App/App");
const pbxproj = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");

if (!existsSync(appDir)) {
  console.error(`✗ ios/App/App/ findes ikke. Kør 'npx cap add ios' først.`);
  process.exit(1);
}

// ---------- 1. Info.plist ----------
const plistSrc = resolve(root, "templates/Info.plist");
const plistDest = resolve(appDir, "Info.plist");
if (!existsSync(plistSrc)) {
  console.error(`✗ Mangler ${plistSrc}`);
  process.exit(1);
}
mkdirSync(dirname(plistDest), { recursive: true });
copyFileSync(plistSrc, plistDest);
console.log(`✓ Info.plist skrevet til ${plistDest}`);

// Verificér baggrunds-lokation + usage descriptions.
const plist = readFileSync(plistDest, "utf8");
const requiredKeys = [
  "NSLocationWhenInUseUsageDescription",
  "NSLocationAlwaysAndWhenInUseUsageDescription",
  "NSLocationAlwaysUsageDescription",
  "UIBackgroundModes",
];
const missing = requiredKeys.filter((k) => !plist.includes(`<key>${k}</key>`));
if (missing.length || !/<key>UIBackgroundModes<\/key>\s*<array>[\s\S]*?<string>location<\/string>/.test(plist)) {
  console.error(`✗ Info.plist mangler location-opsætning: ${missing.join(", ") || "UIBackgroundModes → location"}`);
  process.exit(1);
}
console.log("✓ Background Modes → Location updates + usage descriptions er på plads");

// ---------- 2. OrbitGeo Swift-plugin ----------
const swiftSrc = resolve(root, "templates/ios/OrbitGeo.swift");
if (!existsSync(swiftSrc)) {
  console.error(`✗ Mangler ${swiftSrc}`);
  process.exit(1);
}
copyFileSync(swiftSrc, resolve(appDir, "OrbitGeo.swift"));
console.log(`✓ OrbitGeo.swift kopieret til ${appDir}/OrbitGeo.swift`);

// ---------- 3. Mørk native WebView-host ----------
const viewControllerSrc = resolve(root, "templates/ios/OrbitViewController.swift");
if (!existsSync(viewControllerSrc)) {
  console.error(`✗ Mangler ${viewControllerSrc}`);
  process.exit(1);
}
copyFileSync(viewControllerSrc, resolve(appDir, "OrbitViewController.swift"));
console.log(`✓ OrbitViewController.swift kopieret til ${appDir}/OrbitViewController.swift`);

const storyboard = resolve(appDir, "Base.lproj/Main.storyboard");
if (existsSync(storyboard)) {
  const source = readFileSync(storyboard, "utf8");
  const patched = source.replace(
    /customClass="CAPBridgeViewController" customModule="Capacitor"/g,
    'customClass="OrbitViewController" customModule="App" customModuleProvider="target"',
  );
  writeFileSync(storyboard, patched);
  console.log("✓ Main.storyboard bruger OrbitViewController");
}

// ---------- 4. Tilføj Swift-filerne til Xcode-targetet ----------
if (!existsSync(pbxproj)) {
  console.warn("! project.pbxproj ikke fundet — tilføj OrbitGeo.swift manuelt i Xcode.");
  process.exit(0);
}

let proj = readFileSync(pbxproj, "utf8");

const uid = () => randomBytes(12).toString("hex").toUpperCase();
const appDelegateRef = proj.match(/([0-9A-F]{24}) \/\* AppDelegate\.swift \*\//);
const sourcesBuild = proj.match(/([0-9A-F]{24}) \/\* AppDelegate\.swift in Sources \*\//);

for (const filename of ["OrbitGeo.swift", "OrbitViewController.swift"]) {
  if (proj.includes(`${filename} in Sources`)) {
    console.log(`✓ ${filename} er allerede en del af Xcode-targetet`);
    continue;
  }
  const fileRefId = uid();
  const buildFileId = uid();
  proj = proj.replace(
    /(\/\* Begin PBXFileReference section \*\/\n)/,
    `$1\t\t${fileRefId} /* ${filename} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = ${filename}; sourceTree = "<group>"; };\n`,
  );
  proj = proj.replace(
    /(\/\* Begin PBXBuildFile section \*\/\n)/,
    `$1\t\t${buildFileId} /* ${filename} in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* ${filename} */; };\n`,
  );
  if (appDelegateRef) {
    const re = new RegExp(`(\\t\\t\\t\\t${appDelegateRef[1]} \\/\\* AppDelegate\\.swift \\*\\/,\\n)`);
    proj = proj.replace(re, `$1\t\t\t\t${fileRefId} /* ${filename} */,\n`);
  }
  if (sourcesBuild) {
    const re = new RegExp(`(\\t\\t\\t\\t${sourcesBuild[1]} \\/\\* AppDelegate\\.swift in Sources \\*\\/,\\n)`);
    proj = proj.replace(re, `$1\t\t\t\t${buildFileId} /* ${filename} in Sources */,\n`);
  }
}

writeFileSync(pbxproj, proj);
console.log("✓ Native Swift-filer tilføjet til app-targetets Sources");
console.log(`  Kør nu: npx cap sync ios`);
