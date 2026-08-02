import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const distIndex = join(dist, "index.html");
const distClient = join(dist, "client");
const clientIndex = join(distClient, "index.html");
const shellIndex = join(dist, "_shell.html");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await mkdir(dist, { recursive: true });

if (await exists(distClient)) {
  await cp(distClient, dist, { recursive: true, force: true });
}
void clientIndex;

if (!(await exists(distIndex)) && (await exists(shellIndex))) {
  await cp(shellIndex, distIndex, { force: true });
}

if (!(await exists(distIndex))) {
  try {
    const entries = await readdir(dist);
    const fallback = entries.find((f) => f.endsWith(".html"));
    if (fallback) {
      await cp(join(dist, fallback), distIndex, { force: true });
      console.log(`Capacitor build: used ${fallback} as index.html fallback.`);
    }
  } catch {
    /* noop */
  }
}

await rm(join(dist, ".server"), { recursive: true, force: true });
await rm(join(dist, "server"), { recursive: true, force: true });
await rm(distClient, { recursive: true, force: true });

if (!(await exists(distIndex))) {
  throw new Error("Capacitor build failed: dist/index.html was not generated.");
}

console.log("Capacitor build ready: dist/index.html");
