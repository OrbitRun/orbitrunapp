// Generates a shareable PNG summary of a finished run.
// Story-format canvas (1080×1920) with the route polyline, key stats, and any
// new PRs achieved. Drawn purely on a 2D canvas so we don't need to snapshot
// the WebGL Mapbox view (which is slow and CORS-fragile).

import type { Run } from "@/lib/run-types";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import {
  computeRunPrs,
  PR_ORDER,
  previewRunPrs,
  type PrCategory,
} from "@/lib/personal-records";
import type { Lang } from "@/lib/i18n";

const W = 1080;
const H = 1920;

const COLORS = {
  bg: "#0b0d10",
  panel: "rgba(255,255,255,0.04)",
  panelStroke: "rgba(255,255,255,0.08)",
  text: "#f4f6f8",
  muted: "rgba(244,246,248,0.55)",
  neon: "#c8ff3d", // matches --neon (oklch ≈ 0.92 0.21 130)
  neonGlow: "rgba(200,255,61,0.35)",
  routeStroke: "#c8ff3d",
};

const PR_LABEL_EN: Record<PrCategory, string> = {
  "1k": "1 km PR",
  "5k": "5 km PR",
  "10k": "10 km PR",
  half: "Half marathon PR",
  marathon: "Marathon PR",
  fastestKm: "Fastest km",
  longest: "Longest run",
};
const PR_LABEL_DA: Record<PrCategory, string> = {
  "1k": "Ny rekord 1 km",
  "5k": "Ny rekord 5 km",
  "10k": "Ny rekord 10 km",
  half: "Ny halvmaraton-rekord",
  marathon: "Ny maraton-rekord",
  fastestKm: "Hurtigste km",
  longest: "Længste løbetur",
};

function prLabel(cat: PrCategory, lang: Lang): string {
  return (lang === "da" ? PR_LABEL_DA : PR_LABEL_EN)[cat];
}

function prValue(
  cat: PrCategory,
  run: Run,
  lang: Lang,
): string {
  const candidates = computeRunPrs(run);
  const c = candidates.find((x) => x.category === cat);
  if (!c) return "";
  if (cat === "longest") {
    return `${formatDistance(c.value)} ${lang === "da" ? "km" : "km"}`;
  }
  if (cat === "fastestKm") {
    // value is ms-equivalent of pace seconds (sec * 1000)
    return formatPace(c.value / 1000);
  }
  // Time-based for fixed distances — value is duration ms.
  return formatDuration(c.value);
}

function project(
  pts: { lat: number; lng: number }[],
  box: { x: number; y: number; w: number; h: number },
): { x: number; y: number }[] {
  if (pts.length === 0) return [];
  let minLat = Infinity,
    maxLat = -Infinity,
    minLng = Infinity,
    maxLng = -Infinity;
  for (const p of pts) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latSpan = Math.max(1e-6, maxLat - minLat);
  const lngSpan = Math.max(1e-6, maxLng - minLng);
  // Compensate for latitude distortion so the route keeps its real proportions.
  const meanLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const xSpan = lngSpan * Math.cos(meanLatRad);
  const ySpan = latSpan;
  const scale = Math.min(box.w / xSpan, box.h / ySpan);
  const drawW = xSpan * scale;
  const drawH = ySpan * scale;
  const offX = box.x + (box.w - drawW) / 2;
  const offY = box.y + (box.h - drawH) / 2;
  return pts.map((p) => ({
    x: offX + (p.lng - minLng) * Math.cos(meanLatRad) * scale,
    y: offY + (maxLat - p.lat) * scale, // invert Y
  }));
}

function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 32,
) {
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = COLORS.panelStroke;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.stroke();
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
  lang: Lang,
  appName = "ORBIT",
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // Background — radial neon halo on dark.
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  const halo = ctx.createRadialGradient(W / 2, H * 0.35, 100, W / 2, H * 0.35, 900);
  halo.addColorStop(0, "rgba(200,255,61,0.18)");
  halo.addColorStop(1, "rgba(11,13,16,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.neon;
  ctx.font = "800 32px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(appName, W / 2, 110);

  ctx.fillStyle = COLORS.text;
  ctx.font = "900 64px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  ctx.fillText(lang === "da" ? "LØB AFSLUTTET" : "RUN COMPLETE", W / 2, 190);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI";
  const dt = new Date(run.startedAt);
  const dateLabel = dt.toLocaleDateString(lang === "da" ? "da-DK" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  ctx.fillText(dateLabel, W / 2, 240);

  // Route panel
  const routeBox = { x: 60, y: 290, w: W - 120, h: 720 };
  drawPanel(ctx, routeBox.x, routeBox.y, routeBox.w, routeBox.h, 40);

  // Project + draw polyline
  if (run.points.length >= 2) {
    const inner = {
      x: routeBox.x + 60,
      y: routeBox.y + 60,
      w: routeBox.w - 120,
      h: routeBox.h - 120,
    };
    const proj = project(run.points, inner);

    // Glow underlay
    ctx.save();
    ctx.shadowColor = COLORS.neonGlow;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = COLORS.routeStroke;
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(proj[0].x, proj[0].y);
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
    ctx.stroke();
    ctx.restore();

    // Crisp top stroke
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(proj[0].x, proj[0].y);
    for (let i = 1; i < proj.length; i++) ctx.lineTo(proj[i].x, proj[i].y);
    ctx.stroke();

    // Start + end markers
    const start = proj[0];
    const end = proj[proj.length - 1];
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(start.x, start.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.neon;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = "600 28px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText(
      lang === "da" ? "Ingen rute optaget" : "No route recorded",
      W / 2,
      routeBox.y + routeBox.h / 2,
    );
  }

  // Hero distance
  const heroY = 1110;
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.muted;
  ctx.font = "700 28px ui-sans-serif, system-ui";
  ctx.fillText(lang === "da" ? "DISTANCE" : "DISTANCE", W / 2, heroY);

  ctx.fillStyle = COLORS.neon;
  ctx.font = "900 180px ui-sans-serif, system-ui";
  const distStr = formatDistance(run.distanceM);
  ctx.fillText(distStr, W / 2, heroY + 170);

  ctx.fillStyle = COLORS.muted;
  ctx.font = "700 36px ui-sans-serif, system-ui";
  ctx.fillText("km", W / 2, heroY + 220);

  // Stats row (duration / pace / elevation)
  const statsY = 1380;
  const cellW = (W - 160) / 3;
  const stats: { label: string; value: string }[] = [
    {
      label: lang === "da" ? "TID" : "TIME",
      value: formatDuration(run.durationMs),
    },
    {
      label: lang === "da" ? "TEMPO" : "PACE",
      value: formatPace(run.avgPaceSecPerKm),
    },
    {
      label: lang === "da" ? "STIGNING" : "ELEVATION",
      value: `${Math.round(run.elevationGainM)} m`,
    },
  ];
  ctx.textAlign = "center";
  stats.forEach((s, i) => {
    const cx = 80 + cellW * i + cellW / 2;
    ctx.fillStyle = COLORS.muted;
    ctx.font = "700 24px ui-sans-serif, system-ui";
    ctx.fillText(s.label, cx, statsY);
    ctx.fillStyle = COLORS.text;
    ctx.font = "900 60px ui-sans-serif, system-ui";
    ctx.fillText(s.value, cx, statsY + 70);
  });

  // PR section — only render if there are pending PRs.
  const prs = previewRunPrs(run).sort(
    (a, b) => PR_ORDER.indexOf(a) - PR_ORDER.indexOf(b),
  );
  if (prs.length > 0) {
    const prPanelX = 60;
    const prPanelY = 1530;
    const prPanelW = W - 120;
    const rowH = 80;
    const headerH = 90;
    const prPanelH = headerH + prs.length * rowH + 30;
    drawPanel(ctx, prPanelX, prPanelY, prPanelW, prPanelH, 36);

    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.neon;
    ctx.font = "900 36px ui-sans-serif, system-ui";
    ctx.fillText(
      lang === "da" ? "★ NYE PERSONLIGE REKORDER" : "★ NEW PERSONAL RECORDS",
      prPanelX + 36,
      prPanelY + 56,
    );

    prs.forEach((cat, i) => {
      const ry = prPanelY + headerH + i * rowH + rowH / 2;
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.text;
      ctx.font = "700 32px ui-sans-serif, system-ui";
      ctx.fillText(prLabel(cat, lang), prPanelX + 36, ry + 12);

      ctx.textAlign = "right";
      ctx.fillStyle = COLORS.neon;
      ctx.font = "900 36px ui-mono, ui-monospace, Menlo, monospace";
      ctx.fillText(prValue(cat, run, lang), prPanelX + prPanelW - 36, ry + 12);
    });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    );
  });
}

export async function shareRun(run: Run, lang: Lang): Promise<"shared" | "downloaded"> {
  const blob = await generateShareCard(run, lang);
  const file = new File([blob], `orbit-run-${run.id}.png`, { type: "image/png" });

  // Web Share API with files (mobile-first).
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: lang === "da" ? "Mit løb" : "My run",
        text: lang === "da" ? "Friskt løb fra ORBIT" : "Fresh run from ORBIT",
      });
      return "shared";
    } catch (err) {
      // User cancelled or share failed — fall through to download.
      if ((err as Error).name === "AbortError") return "shared";
    }
  }

  // Fallback: trigger download.
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
