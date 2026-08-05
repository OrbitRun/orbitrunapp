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

// ---------- 3. Tilføj filen til Xcode-targetet ----------
if (!existsSync(pbxproj)) {
  console.warn("! project.pbxproj ikke fundet — tilføj OrbitGeo.swift manuelt i Xcode.");
  process.exit(0);
}

let proj = readFileSync(pbxproj, "utf8");
if (proj.includes("OrbitGeo.swift")) {
  console.log("✓ OrbitGeo.swift er allerede en del af Xcode-targetet");
  process.exit(0);
}

const uid = () => randomBytes(12).toString("hex").toUpperCase();
const fileRefId = uid();
const buildFileId = uid();

// 3a. PBXFileReference
proj = proj.replace(
  /(\/\* Begin PBXFileReference section \*\/\n)/,
  `$1\t\t${fileRefId} /* OrbitGeo.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = OrbitGeo.swift; sourceTree = "<group>"; };\n`,
);

// 3b. PBXBuildFile
proj = proj.replace(
  /(\/\* Begin PBXBuildFile section \*\/\n)/,
  `$1\t\t${buildFileId} /* OrbitGeo.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* OrbitGeo.swift */; };\n`,
);

// 3c. Læg fil-referencen i samme gruppe som AppDelegate.swift
const appDelegateRef = proj.match(/([0-9A-F]{24}) \/\* AppDelegate\.swift \*\//);
if (appDelegateRef) {
  const re = new RegExp(`(\\t\\t\\t\\t${appDelegateRef[1]} \\/\\* AppDelegate\\.swift \\*\\/,\\n)`);
  proj = proj.replace(re, `$1\t\t\t\t${fileRefId} /* OrbitGeo.swift */,\n`);
}

// 3d. Tilføj til Sources build phase
const sourcesBuild = proj.match(/([0-9A-F]{24}) \/\* AppDelegate\.swift in Sources \*\//);
if (sourcesBuild) {
  const re = new RegExp(`(\\t\\t\\t\\t${sourcesBuild[1]} \\/\\* AppDelegate\\.swift in Sources \\*\\/,\\n)`);
  proj = proj.replace(re, `$1\t\t\t\t${buildFileId} /* OrbitGeo.swift in Sources */,\n`);
} else {
  console.warn("! Kunne ikke finde Sources build phase — tilføj OrbitGeo.swift manuelt i Xcode.");
}

writeFileSync(pbxproj, proj);
console.log("✓ OrbitGeo.swift tilføjet til app-targetets Sources");
console.log(`  Kør nu: npx cap sync ios`);
