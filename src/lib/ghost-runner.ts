// Ghost Runner: race a saved run.
// Stores a precomputed cumulative distance/time table + a slim path so the
// live tracker can compare elapsed-time-at-distance and the map can render
// the ghost's position without re-traversing all GPS points.

import type { Run } from "./run-types";
import { haversine } from "./run-utils";

const STORAGE_KEY = "orbit:ghost:v1";
export const GHOST_CHANGED_EVENT = "orbit:ghost-changed";

export type GhostPathPoint = { lat: number; lng: number; t: number }; // t = ms since run start
export type GhostCumPoint = { d: number; t: number }; // d = meters, t = ms since run start

export type GhostRef = {
  runId: string;
  label: string;
  totalDistanceM: number;
  totalDurationMs: number;
  cumulative: GhostCumPoint[];
  path: GhostPathPoint[];
};

export function buildGhost(run: Run, label: string): GhostRef | null {
  if (!run.points || run.points.length < 2) return null;
  const pts = run.points;
  const startT = pts[0].t;
  const cumulative: GhostCumPoint[] = [{ d: 0, t: 0 }];
  const path: GhostPathPoint[] = [{ lat: pts[0].lat, lng: pts[0].lng, t: 0 }];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += haversine(pts[i - 1], pts[i]);
    const tRel = pts[i].t - startT;
    cumulative.push({ d: acc, t: tRel });
    path.push({ lat: pts[i].lat, lng: pts[i].lng, t: tRel });
  }
  return {
    runId: run.id,
    label,
    totalDistanceM: acc,
    totalDurationMs: cumulative[cumulative.length - 1].t,
    cumulative,
    path,
  };
}

export function selectGhost(run: Run, label: string): GhostRef | null {
  const g = buildGhost(run, label);
  if (!g) return null;
  if (typeof window === "undefined") return g;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(g));
    window.dispatchEvent(new CustomEvent(GHOST_CHANGED_EVENT));
  } catch {
    /* noop */
  }
  return g;
}

export function loadGhost(): GhostRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GhostRef;
  } catch {
    return null;
  }
}

export function clearGhost() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(GHOST_CHANGED_EVENT));
  } catch {
    /* noop */
  }
}

// Binary search the largest index with cumulative[idx].d <= target.
function lowerBound<T>(arr: T[], target: number, key: (x: T) => number): number {
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (key(arr[mid]) <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

// Returns the ghost's elapsed time (ms) at the given cumulative distance.
// Returns null when the user has run further than the ghost ever did.
export function ghostTimeAtDistance(g: GhostRef, meters: number): number | null {
  if (meters <= 0) return 0;
  if (meters > g.totalDistanceM) return null;
  const arr = g.cumulative;
  const i = lowerBound(arr, meters, (x) => x.d);
  if (i >= arr.length - 1) return arr[arr.length - 1].t;
  const a = arr[i];
  const b = arr[i + 1];
  const span = b.d - a.d;
  const frac = span > 0 ? (meters - a.d) / span : 0;
  return a.t + (b.t - a.t) * frac;
}

// Returns the ghost's lat/lng at the given elapsed time (ms since start).
export function ghostPositionAt(
  g: GhostRef,
  elapsedMs: number,
): { lat: number; lng: number } | null {
  if (elapsedMs < 0) return null;
  if (elapsedMs > g.totalDurationMs) return null;
  const arr = g.path;
  if (arr.length === 0) return null;
  const i = lowerBound(arr, elapsedMs, (x) => x.t);
  if (i >= arr.length - 1) return { lat: arr[i].lat, lng: arr[i].lng };
  const a = arr[i];
  const b = arr[i + 1];
  const span = b.t - a.t;
  const frac = span > 0 ? (elapsedMs - a.t) / span : 0;
  return {
    lat: a.lat + (b.lat - a.lat) * frac,
    lng: a.lng + (b.lng - a.lng) * frac,
  };
}
