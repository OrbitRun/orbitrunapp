import type { GeoPoint } from "./run-types";

const R = 6371000; // earth radius m

export function haversine(a: GeoPoint, b: GeoPoint): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 60 * 60) return "--:--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDistance(m: number): string {
  return (m / 1000).toFixed(2);
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// m/s -> color along slow→mid→fast palette (continuous interpolation in OKLCH)
export function speedToColor(speedMs: number | null): string {
  // Stops: slow=1.5 m/s (red), mid=3 m/s (amber), fast=4.5 m/s (lime)
  const s = Math.max(0, speedMs ?? 0);
  // OKLCH stops: [L, C, H]
  const slow = [0.65, 0.22, 22];
  const mid = [0.85, 0.18, 90];
  const fast = [0.92, 0.21, 140];
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const mix = (a: number[], b: number[], t: number) => [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    // Hue is monotonic across our stops (22→90→140), straight lerp is fine.
    lerp(a[2], b[2], t),
  ];
  let c: number[];
  if (s <= 1.5) c = slow;
  else if (s <= 3) c = mix(slow, mid, (s - 1.5) / 1.5);
  else if (s <= 4.5) c = mix(mid, fast, (s - 3) / 1.5);
  else c = fast;
  return `oklch(${c[0].toFixed(3)} ${c[1].toFixed(3)} ${c[2].toFixed(1)})`;
}

// Maximum plausible running speed (m/s). ~7 m/s ≈ 2:23 min/km — faster than
// elite sprint pace, so anything above is almost certainly a GPS glitch.
const MAX_PLAUSIBLE_SPEED_MS = 7;

// Median of a small numeric window.
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Filter GPS speed outliers using a rolling median + clamp. Brief spikes
// (one or two bad samples) are replaced by the local median so they don't
// cause sudden color jumps in the heatmap.
export function filterSpeedOutliers(
  speeds: (number | null)[],
  windowSize = 5,
  maxSpeed = MAX_PLAUSIBLE_SPEED_MS,
): number[] {
  const clamped = speeds.map((s) => {
    const v = Math.max(0, s ?? 0);
    return v > maxSpeed ? maxSpeed : v;
  });
  const half = Math.floor(windowSize / 2);
  const out: number[] = [];
  for (let i = 0; i < clamped.length; i++) {
    const start = Math.max(0, i - half);
    const end = Math.min(clamped.length, i + half + 1);
    const window = clamped.slice(start, end);
    const med = median(window);
    const v = clamped[i];
    // If the sample deviates strongly from the local median, replace with median.
    // Threshold: >2 m/s absolute or >75% relative jump.
    const dev = Math.abs(v - med);
    const rel = med > 0.1 ? dev / med : dev;
    out.push(dev > 2 && rel > 0.75 ? med : v);
  }
  return out;
}

// Exponential moving average smoothing for a sequence of speeds.
// alpha closer to 1 = more responsive, closer to 0 = smoother.
export function smoothSpeeds(speeds: (number | null)[], alpha = 0.25): number[] {
  // Run outlier filtering first so EMA isn't dragged by transient GPS glitches.
  const cleaned = filterSpeedOutliers(speeds);
  const out: number[] = [];
  let ema = 0;
  let seeded = false;
  for (const v of cleaned) {
    if (!seeded) {
      ema = v;
      seeded = true;
    } else {
      ema = alpha * v + (1 - alpha) * ema;
    }
    out.push(ema);
  }
  return out;
}

// Smooth a sequence of GPS coordinates using exponential moving average to
// soften micro-jitters in the raw signal. alpha closer to 1 = more responsive.
export function smoothCoordinates(
  points: GeoPoint[],
  alpha = 0.4,
): { lat: number; lng: number }[] {
  if (points.length === 0) return [];
  const out: { lat: number; lng: number }[] = [];
  let lat = points[0].lat;
  let lng = points[0].lng;
  out.push({ lat, lng });
  for (let i = 1; i < points.length; i++) {
    lat = alpha * points[i].lat + (1 - alpha) * lat;
    lng = alpha * points[i].lng + (1 - alpha) * lng;
    out.push({ lat, lng });
  }
  // Anchor the final point to the true position so the head marker matches.
  out[out.length - 1] = { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng };
  return out;
}

// Catmull-Rom spline interpolation between control points. Produces smooth
// curves rather than jagged straight lines. `segments` is the number of
// interpolated points generated per input segment.
export function catmullRomSpline(
  pts: { lat: number; lng: number }[],
  segments = 8,
): { lat: number; lng: number }[] {
  if (pts.length < 2) return [...pts];
  if (pts.length === 2) return [...pts];
  const out: { lat: number; lng: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    for (let j = 0; j < segments; j++) {
      const t = j / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const lat =
        0.5 *
        (2 * p1.lat +
          (-p0.lat + p2.lat) * t +
          (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * t2 +
          (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * t3);
      const lng =
        0.5 *
        (2 * p1.lng +
          (-p0.lng + p2.lng) * t +
          (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * t2 +
          (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * t3);
      out.push({ lat, lng });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
