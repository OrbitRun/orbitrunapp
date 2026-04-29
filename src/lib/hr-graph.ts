// HR graph helpers — pure, no React.
// Builds an enriched series for the HR analytics chart and computes
// efficiency factor + zone reference lines.

import type { GeoPoint, HrSample, Run } from "@/lib/run-types";
import { haversine } from "@/lib/run-utils";
import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";
import { loadHrZones } from "@/lib/hr-zones-config";

export type HrGraphPoint = {
  /** Absolute timestamp (ms). */
  t: number;
  /** Elapsed ms since run start. Used as the X axis. */
  ms: number;
  /** Cumulative distance up to this point (m). */
  distM: number;
  bpm: number;
  /** Instantaneous pace (sec/km). null when not enough movement. */
  paceSecPerKm: number | null;
  /** Geo coordinate at this moment (linearly interpolated). null if no GPS. */
  coord: { lat: number; lng: number } | null;
};

function interpolateCoord(
  before: GeoPoint,
  after: GeoPoint,
  t: number,
): { lat: number; lng: number } {
  const span = after.t - before.t;
  if (span <= 0) return { lat: before.lat, lng: before.lng };
  const f = Math.max(0, Math.min(1, (t - before.t) / span));
  return {
    lat: before.lat + (after.lat - before.lat) * f,
    lng: before.lng + (after.lng - before.lng) * f,
  };
}

/** Binary search for the largest index `i` with arr[i].t <= t. */
function findLeIndex<T extends { t: number }>(arr: T[], t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  if (arr.length === 0 || t < arr[0].t) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arr[mid].t <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Build an enriched HR series from `run.hrSeries`, joined to the GPS trace
 * for distance + interpolated coordinates. Returns an empty array when no HR.
 */
export function buildHrGraph(run: Pick<Run, "points" | "hrSeries" | "startedAt">): HrGraphPoint[] {
  const series = run.hrSeries;
  if (!series || series.length === 0) return [];
  const points = run.points ?? [];

  // Pre-compute cumulative distance per GPS point.
  const cumDist: number[] = new Array(points.length).fill(0);
  for (let i = 1; i < points.length; i++) {
    cumDist[i] = cumDist[i - 1] + haversine(points[i - 1], points[i]);
  }

  const out: HrGraphPoint[] = [];
  const startedAt = run.startedAt ?? series[0].t;

  for (const s of series) {
    let distM = 0;
    let coord: { lat: number; lng: number } | null = null;
    if (points.length >= 1) {
      const idx = findLeIndex(points, s.t);
      if (idx === -1) {
        distM = 0;
        coord = { lat: points[0].lat, lng: points[0].lng };
      } else if (idx >= points.length - 1) {
        distM = cumDist[points.length - 1];
        coord = { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng };
      } else {
        const a = points[idx];
        const b = points[idx + 1];
        const segLen = haversine(a, b);
        const span = b.t - a.t;
        const frac = span > 0 ? Math.max(0, Math.min(1, (s.t - a.t) / span)) : 0;
        distM = cumDist[idx] + segLen * frac;
        coord = interpolateCoord(a, b, s.t);
      }
    }
    out.push({
      t: s.t,
      ms: Math.max(0, s.t - startedAt),
      distM,
      bpm: s.bpm,
      paceSecPerKm: null,
      coord,
    });
  }

  // Fill instantaneous pace using a ~10s rolling distance window.
  const WINDOW_MS = 10_000;
  for (let i = 0; i < out.length; i++) {
    let j = i;
    while (j > 0 && out[i].ms - out[j].ms < WINDOW_MS) j--;
    const dDist = out[i].distM - out[j].distM;
    const dMs = out[i].ms - out[j].ms;
    if (dDist > 5 && dMs > 1500) {
      const speedMps = dDist / (dMs / 1000);
      out[i].paceSecPerKm = 1000 / speedMps;
    }
  }
  return out;
}

/**
 * Efficiency Factor — Daniels-style aerobic efficiency metric.
 * EF = (avg speed in m/min) / avg HR. Higher = more efficient.
 */
export function efficiencyFactor(run: Pick<Run, "distanceM" | "durationMs" | "avgHrBpm">): number | null {
  if (!run.avgHrBpm || run.avgHrBpm <= 0) return null;
  if (!run.durationMs || run.durationMs <= 0) return null;
  if (!run.distanceM || run.distanceM <= 0) return null;
  const speedMpm = run.distanceM / (run.durationMs / 60_000);
  const ef = speedMpm / run.avgHrBpm;
  if (!Number.isFinite(ef) || ef <= 0) return null;
  return Math.round(ef * 100) / 100;
}

export type ZoneBoundary = {
  zone: 1 | 2 | 3 | 4 | 5;
  /** Lower BPM bound (inclusive). */
  bpm: number;
  labelKey: string;
};

/** Lower bounds of zones 2..5 — used as horizontal guide lines. */
export function zoneBoundaries(maxHr: number = DEFAULT_MAX_HR): ZoneBoundary[] {
  const cfg = loadHrZones();
  if (cfg) {
    return [2, 3, 4, 5].map((z) => ({
      zone: z as 2 | 3 | 4 | 5,
      bpm: cfg.zones[z - 1].lower,
      labelKey: `hr.zone.${z - 1}`,
    }));
  }
  return [
    { zone: 2, bpm: Math.round(maxHr * 0.6), labelKey: "hr.zone.1" },
    { zone: 3, bpm: Math.round(maxHr * 0.7), labelKey: "hr.zone.2" },
    { zone: 4, bpm: Math.round(maxHr * 0.8), labelKey: "hr.zone.3" },
    { zone: 5, bpm: Math.round(maxHr * 0.9), labelKey: "hr.zone.4" },
  ];
}

/** Find the closest sample index to a given elapsed-ms X value. */
export function nearestIndexByMs(series: HrGraphPoint[], ms: number): number {
  if (series.length === 0) return -1;
  let lo = 0;
  let hi = series.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].ms < ms) lo = mid + 1;
    else hi = mid;
  }
  // Compare with neighbour for true nearest.
  if (lo > 0 && Math.abs(series[lo - 1].ms - ms) < Math.abs(series[lo].ms - ms)) return lo - 1;
  return lo;
}

export type HrSummaryStats = {
  maxBpm: number | null;
  avgBpm: number | null;
};

export function summarizeHr(series: HrSample[] | undefined): HrSummaryStats {
  if (!series || series.length === 0) return { maxBpm: null, avgBpm: null };
  let max = -Infinity;
  let sum = 0;
  for (const s of series) {
    if (s.bpm > max) max = s.bpm;
    sum += s.bpm;
  }
  return {
    maxBpm: Number.isFinite(max) ? max : null,
    avgBpm: Math.round(sum / series.length),
  };
}
