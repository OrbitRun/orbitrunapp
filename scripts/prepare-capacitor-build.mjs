import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const distIndex = join(dist, "index.html");
const distClient = join(dist, "client");
const shellIndex = join(dist, "_shell.html");
const distServer = join(dist, "server");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listHtml(dir) {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(".html"));
  } catch {
    return [];
  }
}

/**
 * The SPA shell is only emitted when TanStack's prerender step runs. Prerender
 * is disabled for the native build, so we synthesise an equivalent shell from
 * the build manifest: the root entry script + the emitted stylesheet. The
 * client router renders every route (and all head metadata) after hydration.
 */
async function generateShell() {
  let entry = null;
  const serverFiles = (await exists(distServer)) ? await readdir(distServer) : [];
  for (const file of serverFiles) {
    if (!file.includes("tanstack-start-manifest") || !file.endsWith(".mjs")) continue;
    const src = await readFile(join(distServer, file), "utf8");
    const match = src.match(/__root__:\s*\{[\s\S]*?src:\s*"([^"]+\.js)"/);
    if (match) {
      entry = match[1];
      break;
    }
  }

  const assets = await listAssets();
  if (!entry) {
    // Fallback: pick the largest top-level index chunk as the entry.
    entry = assets.find((f) => /^index-.*\.js$/.test(f)) ? `/assets/${assets.find((f) => /^index-.*\.js$/.test(f))}` : null;
  }
  if (!entry) return false;

  const styles = assets
    .filter((f) => f.startsWith("styles-") && f.endsWith(".css"))
    .map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no" />
    <meta name="theme-color" content="#000000" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="ORBIT" />
    <meta name="format-detection" content="telephone=no" />
    <title>ORBIT RUN</title>
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
${styles}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`;
  await writeFile(distIndex, html, "utf8");
  console.log(`Capacitor build: generated dist/index.html (entry ${entry}).`);
  return true;
}

async function listAssets() {
  try {
    return await readdir(join(dist, "assets"));
  } catch {
    return [];
  }
}

await mkdir(dist, { recursive: true });

// Flatten dist/client -> dist so index.html and assets sit at the web root.
if (await exists(distClient)) {
  await cp(distClient, dist, { recursive: true, force: true });
}

if (!(await exists(distIndex)) && (await exists(shellIndex))) {
  await cp(shellIndex, distIndex, { force: true });
}

if (!(await exists(distIndex))) {
  const fallback = (await listHtml(dist)).find((f) => f !== "index.html");
  if (fallback) {
    await cp(join(dist, fallback), distIndex, { force: true });
    console.log(`Capacitor build: used ${fallback} as index.html fallback.`);
  }
}

if (!(await exists(distIndex))) {
  await generateShell();
}

await rm(join(dist, ".server"), { recursive: true, force: true });
await rm(distServer, { recursive: true, force: true });
await rm(distClient, { recursive: true, force: true });
await rm(join(dist, "nitro.json"), { force: true });
await rm(join(dist, ".wrangler"), { recursive: true, force: true });

if (!(await exists(distIndex))) {
  throw new Error("Capacitor build failed: dist/index.html was not generated.");
}

console.log("Capacitor build ready: dist/index.html");
