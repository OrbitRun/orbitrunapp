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

// m/s -> color along a smooth slow→mid→fast palette.
// Interpolates in OKLCH for a continuous heatmap that updates with every
// new GPS sample. Calibrated for running: ~1.4 m/s (12:00/km walk) →
// ~2.5 m/s (6:40/km easy) → ~3.6 m/s (4:38/km tempo) → ~4.8 m/s+ (3:28/km sprint).
const SPEED_STOPS: Array<{ s: number; l: number; c: number; h: number }> = [
  { s: 1.2, l: 0.6, c: 0.23, h: 18 }, // deep red — walking
  { s: 2.2, l: 0.72, c: 0.22, h: 45 }, // orange — jog
  { s: 3.0, l: 0.85, c: 0.19, h: 90 }, // amber — steady
  { s: 3.8, l: 0.9, c: 0.2, h: 130 }, // lime — tempo
  { s: 4.8, l: 0.88, c: 0.22, h: 165 }, // bright green — fast
];

export function speedToColor(speedMs: number | null): string {
  const s = Math.max(0, speedMs ?? 0);
  if (s <= SPEED_STOPS[0].s) {
    const a = SPEED_STOPS[0];
    return `oklch(${a.l} ${a.c} ${a.h})`;
  }
  const last = SPEED_STOPS[SPEED_STOPS.length - 1];
  if (s >= last.s) return `oklch(${last.l} ${last.c} ${last.h})`;
  for (let i = 1; i < SPEED_STOPS.length; i++) {
    const b = SPEED_STOPS[i];
    const a = SPEED_STOPS[i - 1];
    if (s <= b.s) {
      const t = (s - a.s) / (b.s - a.s);
      const l = a.l + (b.l - a.l) * t;
      const c = a.c + (b.c - a.c) * t;
      const h = a.h + (b.h - a.h) * t;
      return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
    }
  }
  return `oklch(${last.l} ${last.c} ${last.h})`;
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
