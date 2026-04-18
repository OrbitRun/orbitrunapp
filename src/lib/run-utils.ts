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

// m/s -> color along slow→mid→fast palette
export function speedToColor(speedMs: number | null): string {
  // Running ranges: 1.5 m/s (~11min/km slow walk-jog), 3 m/s (~5:30/km), 4.5 m/s+ (~3:40/km sprint)
  const s = speedMs ?? 0;
  const slow = "oklch(0.65 0.22 22)"; // red
  const mid = "oklch(0.85 0.18 90)"; // amber
  const fast = "oklch(0.92 0.21 140)"; // lime
  if (s < 2) return slow;
  if (s < 3.3) return mid;
  return fast;
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
