import { rename, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const src = join(dist, "index.capacitor.html");
const target = join(dist, "index.html");

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (await exists(src)) {
  await rm(target, { force: true });
  await rename(src, target);
}

// Nothing server-related should ever ship in the native bundle.
await rm(join(dist, "server"), { recursive: true, force: true });
await rm(join(dist, ".server"), { recursive: true, force: true });
await rm(join(dist, "nitro.json"), { force: true });
await rm(join(dist, ".wrangler"), { recursive: true, force: true });

if (!(await exists(target))) {
  throw new Error("Capacitor build failed: dist/index.html was not generated.");
}

console.log("Capacitor SPA build ready: dist/index.html");
