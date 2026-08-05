#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const checks = [];

function read(relativePath) {
  const path = resolve(root, relativePath);
  if (!existsSync(path)) throw new Error(`Mangler native build-artefakt: ${relativePath}`);
  return readFileSync(path, "utf8");
}

function requireMatch(relativePath, pattern, description) {
  const source = read(relativePath);
  if (!pattern.test(source)) throw new Error(`${description} mangler i ${relativePath}`);
  checks.push(description);
}

requireMatch(
  "ios/App/App/capacitor.config.json",
  /"contentInset"\s*:\s*"never"/,
  "contentInset=never",
);
requireMatch(
  "ios/App/App/capacitor.config.json",
  /"resize"\s*:\s*"native"/,
  "Keyboard resize=native",
);
requireMatch(
  "ios/App/App/Base.lproj/Main.storyboard",
  /customClass="OrbitViewController"/,
  "OrbitViewController i Main.storyboard",
);
requireMatch(
  "ios/App/App/Base.lproj/LaunchScreen.storyboard",
  /red="0\.007843137255" green="0\.043137254902" blue="0\.058823529412"/,
  "mørk native LaunchScreen",
);
requireMatch(
  "ios/App/App/OrbitViewController.swift",
  /contentInsetAdjustmentBehavior\s*=\s*\.never/,
  "WKWebView inset adjustment=never",
);
requireMatch(
  "ios/App/App.xcodeproj/project.pbxproj",
  /OrbitViewController\.swift in Sources/,
  "OrbitViewController i Compile Sources",
);
requireMatch(
  "ios/App/App/public/index.html",
  /<script type="module"[^>]+src="[^"]+\.js"/,
  "Capacitor SPA-entry",
);

const assets = read("ios/App/App/public/index.html");
if (!assets.includes("viewport-fit=cover")) {
  throw new Error("viewport-fit=cover mangler i native index.html");
}
checks.push("viewport-fit=cover");

console.log(`✓ Native iOS-build verificeret (${checks.join(", ")})`);