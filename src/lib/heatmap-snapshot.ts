// Lightweight SVG snapshot of a run's path, colored by speed.
// Stored as a data URL on the Run so history cards render instantly without
// loading Mapbox. Uses the same speed→color palette as the live heatmap.

import type { GeoPoint } from "./run-types";
import { haversine, speedToColor } from "./run-utils";

const WIDTH = 480;
const HEIGHT = 240;
const PADDING = 12;

/**
 * Build a self-contained SVG (data URL) showing the route as a colored
 * polyline. Returns null when the run has too few points to draw.
 */
export function buildHeatmapSnapshot(points: GeoPoint[]): string | null {
  if (!points || points.length < 2) return null;

  // Project lat/lng into SVG space, preserving aspect ratio.
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  const latRange = Math.max(1e-6, maxLat - minLat);
  const lngRange = Math.max(1e-6, maxLng - minLng);
  // Latitude correction so the route doesn't look squashed at higher latitudes.
  const latCorrection = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const aspectData = (lngRange * latCorrection) / latRange;
  const aspectBox = (WIDTH - PADDING * 2) / (HEIGHT - PADDING * 2);

  let drawW: number;
  let drawH: number;
  if (aspectData > aspectBox) {
    drawW = WIDTH - PADDING * 2;
    drawH = drawW / aspectData;
  } else {
    drawH = HEIGHT - PADDING * 2;
    drawW = drawH * aspectData;
  }
  const offsetX = (WIDTH - drawW) / 2;
  const offsetY = (HEIGHT - drawH) / 2;

  const project = (p: GeoPoint): [number, number] => {
    const x = offsetX + ((p.lng - minLng) / lngRange) * drawW;
    // Invert Y because SVG origin is top-left.
    const y = offsetY + (1 - (p.lat - minLat) / latRange) * drawH;
    return [x, y];
  };

  // Compute a smoothed speed per segment (same approach as RunMap) so colors
  // match the live heatmap.
  const WINDOW_MS = 6000;
  const MIN_DIST_M = 4;
  const segments: string[] = [];
  for (const [i, b] of points.entries()) {
    if (i === 0) continue;
    const a = points[i - 1];

    let j = i;
    let dist = 0;
    while (j > 0 && b.t - points[j - 1].t <= WINDOW_MS) {
      dist += haversine(points[j - 1], points[j]);
      j--;
    }
    const dur = (b.t - points[j].t) / 1000;
    let speed: number | null = null;
    if (dur > 0 && dist >= MIN_DIST_M) speed = dist / dur;
    else if (b.speed != null && b.speed >= 0) speed = b.speed;

    const color = speedToColor(speed);
    const [x1, y1] = project(a);
    const [x2, y2] = project(b);
    segments.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" />`,
    );
  }

  // Start and end markers
  const [sx, sy] = project(points[0]);
  const [ex, ey] = project(points[points.length - 1]);

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid meet">` +
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="oklch(0.18 0.02 250)"/>` +
    // Subtle glow under-layer
    `<g stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.28" filter="blur(2px)">${segments.join("")}</g>` +
    // Crisp top-layer
    `<g stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${segments.join("")}</g>` +
    `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4" fill="#fff" stroke="oklch(0.92 0.21 130)" stroke-width="2"/>` +
    `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="oklch(0.92 0.21 130)" stroke="#fff" stroke-width="2"/>` +
    `</svg>`;

  // Encode as a data URL. Using encodeURIComponent keeps non-ASCII safe and
  // avoids btoa unicode pitfalls.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
