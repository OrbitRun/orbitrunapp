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

// Exponential moving average smoothing for a sequence of speeds.
// alpha closer to 1 = more responsive, closer to 0 = smoother.
export function smoothSpeeds(speeds: (number | null)[], alpha = 0.25): number[] {
  const out: number[] = [];
  let ema = 0;
  let seeded = false;
  for (const raw of speeds) {
    const v = raw ?? 0;
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

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
