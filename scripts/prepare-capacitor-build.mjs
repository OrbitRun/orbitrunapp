// Capacitor-only build preparation.
// Runs AFTER the normal production build (`vite build`), and never as part of it.
// The framework emits the browser bundle to dist/client (with dist/.server for SSR).
// Capacitor needs a plain static folder with index.html at its root, so we copy
// dist/client into dist-capacitor (see webDir in capacitor.config.ts).
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const distClient = join(dist, "client");
const outDir = "dist-capacitor";
const outIndex = join(outDir, "index.html");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

const source = (await exists(distClient)) ? distClient : dist;

if (!(await exists(source))) {
  throw new Error(
    "Capacitor build failed: no build output found. Run `vite build` first.",
  );
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(source, outDir, { recursive: true, force: true });

// Never ship server bundles inside the native app.
await rm(join(outDir, ".server"), { recursive: true, force: true });
await rm(join(outDir, "server"), { recursive: true, force: true });
await rm(join(outDir, "client"), { recursive: true, force: true });

if (!(await exists(outIndex))) {
  const shell = join(outDir, "_shell.html");
  if (await exists(shell)) {
    await cp(shell, outIndex, { force: true });
  } else {
    const entries = await readdir(outDir);
    const fallback = entries.find((f) => f.endsWith(".html"));
    if (fallback) {
      await cp(join(outDir, fallback), outIndex, { force: true });
      console.log(`Capacitor build: used ${fallback} as index.html fallback.`);
    } else {
      // SSR-only output (no static shell). Generate a minimal SPA shell that
      // boots the client entry emitted by the build.
      const entry = await findClientEntry();
      const assets = await readdir(join(outDir, "assets")).catch(() => []);
      const css = assets
        .filter((f) => f.startsWith("styles") && f.endsWith(".css"))
        .map((f) => `    <link rel="stylesheet" href="/assets/${f}" />`)
        .join("\n");
      await writeFile(
        outIndex,
        `<!doctype html>
<html lang="da">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <link rel="manifest" href="/manifest.webmanifest" />
${css}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${entry}"></script>
  </body>
</html>
`,
        "utf8",
      );
      console.log(`Capacitor build: generated SPA shell for entry ${entry}.`);
    }
  }
}

if (!(await exists(outIndex))) {
  throw new Error(
    `Capacitor build failed: ${outIndex} was not generated (source: ${source}).`,
  );
}

console.log(`Capacitor build ready: ${outIndex}`);
