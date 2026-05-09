// High-end 1:1 share card generator. Two modes: Map (Mapbox static)
// or Photo (user-supplied). Minimalist data overlay, strictly no glow.

import type { Run } from "@/lib/run-types";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import { previewRunPrs } from "@/lib/personal-records";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import type { Lang } from "@/lib/i18n";

const SIZE = 1080;
const NEON = "#c8ff3d";

export type ShareMode = "map" | "photo";

export type ShareOptions = {
  mode: ShareMode;
  photoDataUrl?: string;
};

// --- Polyline encoding (Google polyline algorithm, precision 5) -------------
function encodePolyline(points: { lat: number; lng: number }[]): string {
  let prevLat = 0;
  let prevLng = 0;
  let out = "";
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += encodeSigned(lat - prevLat) + encodeSigned(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

function encodeSigned(n: number): string {
  let v = n < 0 ? ~(n << 1) : n << 1;
  let out = "";
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  out += String.fromCharCode(v + 63);
  return out;
}

// Reduce point count to fit Mapbox static URL length budget (~8k chars).
function downsample<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = arr.length / maxPoints;
  const out: T[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function fetchMapboxStatic(run: Run): Promise<HTMLImageElement | null> {
  if (run.points.length < 2) return null;
  const sampled = downsample(run.points, 220);
  const encoded = encodePolyline(sampled.map((p) => ({ lat: p.lat, lng: p.lng })));
  // path-{width}+{color}-{opacity}({encoded})
  const overlay = `path-5+c8ff3d-1(${encodeURIComponent(encoded)})`;
  const url = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${overlay}/auto/540x540@2x?padding=80&access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`;
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

// Manual fallback: project polyline onto a flat dark canvas.
function drawFallbackRoute(ctx: CanvasRenderingContext2D, run: Run) {
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, SIZE, SIZE);
  if (run.points.length < 2) return;
  const pts = run.points;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const meanLat = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const xSpan = Math.max(1e-6, (maxLng - minLng) * Math.cos(meanLat));
  const ySpan = Math.max(1e-6, maxLat - minLat);
  const pad = 140;
  const inner = SIZE - pad * 2;
  const scale = Math.min(inner / xSpan, inner / ySpan);
  const drawW = xSpan * scale;
  const drawH = ySpan * scale;
  const offX = (SIZE - drawW) / 2;
  const offY = (SIZE - drawH) / 2;
  const proj = pts.map((p) => ({
    x: offX + (p.lng - minLng) * Math.cos(meanLat) * scale,
    y: offY + (maxLat - p.lat) * scale,
  }));
  ctx.strokeStyle = NEON;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(proj[0].x, proj[0].y);
  for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
  ctx.stroke();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const ratio = Math.max(SIZE / img.width, SIZE / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  run: Run,
  mode: ShareMode,
  lang: Lang,
) {
  // Top + bottom darkening for legibility (stronger on photo mode).
  const top = ctx.createLinearGradient(0, 0, 0, 320);
  const bot = ctx.createLinearGradient(0, SIZE - 460, 0, SIZE);
  if (mode === "photo") {
    top.addColorStop(0, "rgba(0,0,0,0.55)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    bot.addColorStop(0, "rgba(0,0,0,0)");
    bot.addColorStop(1, "rgba(0,0,0,0.78)");
  } else {
    top.addColorStop(0, "rgba(0,0,0,0.45)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    bot.addColorStop(0, "rgba(0,0,0,0)");
    bot.addColorStop(1, "rgba(0,0,0,0.65)");
  }
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, SIZE, 320);
  ctx.fillStyle = bot;
  ctx.fillRect(0, SIZE - 460, SIZE, 460);

  const sans = "ui-sans-serif, system-ui, -apple-system, Segoe UI, Inter";
  const mono = "ui-monospace, Menlo, Consolas, monospace";

  // Top-left: ORBIT RUN wordmark.
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `800 28px ${sans}`;
  ctx.letterSpacing = "6px"; // ignored by canvas but kept for intent
  // Manual letter-spacing emulation:
  drawTracked(ctx, "ORBIT RUN", 80, 100, 6);

  // Top-right: PR pill if any.
  const hasPr = previewRunPrs(run).length > 0;
  if (hasPr) {
    const label = "PR";
    ctx.font = `900 22px ${sans}`;
    const padX = 22;
    const padY = 12;
    const w = ctx.measureText(label).width + padX * 2;
    const h = 44;
    const x = SIZE - 80 - w;
    const y = 100 - h + 8;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.textAlign = "center";
    ctx.fillText(label, x + w / 2, y + h - padY - 2);
  }

  // Center: distance hero.
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 260px ${sans}`;
  const distStr = formatDistance(run.distanceM);
  ctx.fillText(distStr, SIZE / 2, SIZE / 2 + 40);

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = `700 32px ${sans}`;
  drawTracked(ctx, "KM", SIZE / 2, SIZE / 2 + 90, 8, "center");

  // Bottom-left: time. Bottom-right: pace.
  const baseY = SIZE - 90;
  const labelY = SIZE - 145;

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 22px ${sans}`;
  drawTracked(ctx, lang === "da" ? "TID" : "TIME", 80, labelY, 5);
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 56px ${mono}`;
  ctx.fillText(formatDuration(run.durationMs), 80, baseY);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 22px ${sans}`;
  drawTracked(ctx, lang === "da" ? "TEMPO" : "PACE", SIZE - 80, labelY, 5, "right");
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 56px ${mono}`;
  ctx.fillText(`${formatPace(run.avgPaceSecPerKm)}`, SIZE - 80, baseY);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `700 22px ${sans}`;
  ctx.fillText("/KM", SIZE - 80, baseY + 28);
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cursor = x;
  if (align === "center") cursor = x - total / 2;
  else if (align === "right") cursor = x - total;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursor, y);
    cursor += widths[i] + spacing;
  }
  ctx.textAlign = prevAlign;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export async function generateShareCard(
  run: Run,
  opts: ShareOptions,
  lang: Lang,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  if (opts.mode === "photo" && opts.photoDataUrl) {
    try {
      const img = await loadImage(opts.photoDataUrl);
      drawCoverImage(ctx, img);
    } catch {
      ctx.fillStyle = "#0b0d10";
      ctx.fillRect(0, 0, SIZE, SIZE);
    }
  } else {
    const map = await fetchMapboxStatic(run);
    if (map) {
      drawCoverImage(ctx, map);
    } else {
      drawFallbackRoute(ctx, run);
    }
  }

  drawOverlay(ctx, run, opts.mode, lang);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

export async function shareBlob(
  blob: Blob,
  runId: string,
  lang: Lang,
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], `orbit-run-${runId}.png`, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: lang === "da" ? "Mit løb" : "My run",
        text: lang === "da" ? "Friskt løb fra Orbit Run" : "Fresh run from Orbit Run",
      });
      return "shared";
    } catch (err) {
      if ((err as Error).name === "AbortError") return "shared";
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
