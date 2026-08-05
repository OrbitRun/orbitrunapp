#!/usr/bin/env node
// Kopierer templates/Info.plist ind i ios/App/App/Info.plist efter
// `npx cap add ios`. Sikrer at GPS / Spotify / Health / Motion / BLE
// permissions altid er korrekte uden manuel Xcode-redigering.
//
// Kopierer desuden templates/ios/OrbitGeo.swift ind i App-targetet og
// registrerer filen i Xcode-projektet (idempotent).
//
// Kør:  node scripts/apply-ios-template.mjs
// Skal køres EFTER `npx cap add ios` og FØR `npx cap sync ios`.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";

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

// ---------------------------------------------------------------------------
// OrbitGeo.swift → ios/App/App/OrbitGeo.swift
// ---------------------------------------------------------------------------
const swiftSrc = resolve(root, "templates/ios/OrbitGeo.swift");
const swiftDest = resolve(root, "ios/App/App/OrbitGeo.swift");

if (!existsSync(swiftSrc)) {
  console.error(`✗ Mangler ${swiftSrc}`);
  process.exit(1);
}
copyFileSync(swiftSrc, swiftDest);
console.log(`✓ OrbitGeo.swift skrevet til ${swiftDest}`);

// ---------------------------------------------------------------------------
// Registrér OrbitGeo.swift i Xcode-projektet (idempotent)
// ---------------------------------------------------------------------------
const pbxPath = resolve(root, "ios/App/App.xcodeproj/project.pbxproj");
if (!existsSync(pbxPath)) {
  console.error(`✗ Mangler ${pbxPath}`);
  process.exit(1);
}

let pbx = readFileSync(pbxPath, "utf8");
const newId = () => randomBytes(12).toString("hex").toUpperCase();

if (pbx.includes("OrbitGeo.swift")) {
  console.log("✓ OrbitGeo.swift er allerede registreret i Xcode-projektet");
} else {
  const fileRefId = newId();
  const buildFileId = newId();

  // 1. PBXBuildFile
  pbx = pbx.replace(
    /(\/\* Begin PBXBuildFile section \*\/\n)/,
    `$1\t\t${buildFileId} /* OrbitGeo.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${fileRefId} /* OrbitGeo.swift */; };\n`,
  );

  // 2. PBXFileReference
  pbx = pbx.replace(
    /(\/\* Begin PBXFileReference section \*\/\n)/,
    `$1\t\t${fileRefId} /* OrbitGeo.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = OrbitGeo.swift; sourceTree = "<group>"; };\n`,
  );

  // 3. App group (gruppen der indeholder AppDelegate.swift)
  const appDelegateRef = pbx.match(
    /([0-9A-F]{24}) \/\* AppDelegate\.swift \*\/,/,
  );
  if (appDelegateRef) {
    pbx = pbx.replace(
      appDelegateRef[0],
      `${appDelegateRef[0]}\n\t\t\t\t${fileRefId} /* OrbitGeo.swift */,`,
    );
  } else {
    console.warn("⚠ Kunne ikke finde App-gruppen — tilføj OrbitGeo.swift manuelt i Xcode.");
  }

  // 4. Sources build phase
  const appDelegateBuild = pbx.match(
    /([0-9A-F]{24}) \/\* AppDelegate\.swift in Sources \*\/,/,
  );
  if (appDelegateBuild) {
    pbx = pbx.replace(
      appDelegateBuild[0],
      `${appDelegateBuild[0]}\n\t\t\t\t${buildFileId} /* OrbitGeo.swift in Sources */,`,
    );
  } else {
    console.warn("⚠ Kunne ikke finde Sources-fasen — tilføj OrbitGeo.swift manuelt i Xcode.");
  }

  writeFileSync(pbxPath, pbx, "utf8");
  console.log("✓ OrbitGeo.swift registreret i App-targetet");
}

// ---------------------------------------------------------------------------
// Verificér Background Modes → Location updates
// ---------------------------------------------------------------------------
const plist = readFileSync(dest, "utf8");
const bgBlock = plist.match(/<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/);
if (bgBlock && bgBlock[1].includes("<string>location</string>")) {
  console.log("✓ Background Modes → Location updates er aktiveret (UIBackgroundModes: location)");
} else {
  console.error(
    "✗ UIBackgroundModes mangler 'location' i Info.plist — baggrunds-GPS vil IKKE virke.\n" +
      "  Tilføj <string>location</string> under UIBackgroundModes i templates/Info.plist,\n" +
      "  eller slå Signing & Capabilities → Background Modes → Location updates til i Xcode.",
  );
  process.exit(1);
}

console.log(`  Kør nu: npx cap sync ios`);
