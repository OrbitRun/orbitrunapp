// Pure helpers for the post-run replay + pace heatmap.
import type { GeoPoint, Run } from "@/lib/run-types";
import { haversine } from "@/lib/run-utils";

export type ReplaySample = {
  ms: number;        // elapsed ms since startedAt
  t: number;         // absolute timestamp
  distM: number;     // cumulative distance (m)
  lat: number;
  lng: number;
  alt: number | null;
  paceSecPerKm: number | null;
  speedMps: number | null;
};

export type ReplaySegment = {
  from: ReplaySample;
  to: ReplaySample;
  paceSecPerKm: number; // pace assigned to this segment
  color: string;        // resolved color for this segment
};

export type ReplaySeries = {
  samples: ReplaySample[];
  segments: ReplaySegment[];
  totalMs: number;
  totalDistM: number;
  paceMin: number; // fastest (lowest sec/km) used in ramp
  paceMax: number; // slowest used in ramp
  paceMid: number; // median
  elevMin: number;
  elevMax: number;
};

const PACE_WINDOW_MS = 10_000;
const ALT_EMA_ALPHA = 0.25;

// Color stops as hex (Mapbox GL cannot parse oklch()).
// neon (fast) -> amber (mid) -> red (slow).
const C_FAST = "#C6F432";
const C_MID = "#F5C242";
const C_SLOW = "#E5484D";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function parseHex(s: string): [number, number, number] {
  const h = s.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(n: number): string {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return v.toString(16).padStart(2, "0");
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return `#${toHex(lerp(ar, br, t))}${toHex(lerp(ag, bg, t))}${toHex(lerp(ab, bb, t))}`;
}

/** Map pace (sec/km) to a color along fast→mid→slow. Lower pace = faster. */
export function paceColor(
  pace: number,
  paceMin: number,
  paceMax: number,
): string {
  if (!Number.isFinite(pace) || paceMax <= paceMin) return C_MID;
  const t = Math.max(0, Math.min(1, (pace - paceMin) / (paceMax - paceMin)));
  if (t < 0.5) return mixHex(C_FAST, C_MID, t / 0.5);
  return mixHex(C_MID, C_SLOW, (t - 0.5) / 0.5);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1))));
  return sorted[idx];
}

export function buildReplaySeries(
  run: Pick<Run, "points" | "startedAt">,
): ReplaySeries {
  const pts: GeoPoint[] = run.points ?? [];
  const samples: ReplaySample[] = [];
  if (pts.length === 0) {
    return {
      samples,
      segments: [],
      totalMs: 0,
      totalDistM: 0,
      paceMin: 240,
      paceMax: 600,
      paceMid: 360,
      elevMin: 0,
      elevMax: 0,
    };
  }

  const startedAt = run.startedAt ?? pts[0].t;
  let cumDist = 0;
  let altEma: number | null = null;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i > 0) cumDist += haversine(pts[i - 1], p);
    let smoothedAlt: number | null = p.alt;
    if (typeof p.alt === "number") {
      altEma = altEma == null ? p.alt : altEma + ALT_EMA_ALPHA * (p.alt - altEma);
      smoothedAlt = altEma;
    }
    samples.push({
      t: p.t,
      ms: Math.max(0, p.t - startedAt),
      distM: cumDist,
      lat: p.lat,
      lng: p.lng,
      alt: smoothedAlt,
      paceSecPerKm: null,
      speedMps: null,
    });
  }

  // 10s rolling window pace + speed
  for (let i = 0; i < samples.length; i++) {
    let j = i;
    while (j > 0 && samples[i].ms - samples[j].ms < PACE_WINDOW_MS) j--;
    const dDist = samples[i].distM - samples[j].distM;
    const dMs = samples[i].ms - samples[j].ms;
    if (dDist > 3 && dMs > 1000) {
      const speed = dDist / (dMs / 1000);
      samples[i].speedMps = speed;
      samples[i].paceSecPerKm = speed > 0.1 ? 1000 / speed : null;
    }
  }

  // Fallback: per-segment instantaneous if no rolling pace was filled
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].paceSecPerKm == null) {
      const dDist = samples[i].distM - samples[i - 1].distM;
      const dMs = samples[i].ms - samples[i - 1].ms;
      if (dDist > 1 && dMs > 250) {
        const speed = dDist / (dMs / 1000);
        samples[i].speedMps = speed;
        samples[i].paceSecPerKm = speed > 0.1 ? 1000 / speed : null;
      }
    }
  }

  // Pace stats with 5/95 percentile clamps
  const paces = samples
    .map((s) => s.paceSecPerKm)
    .filter((p): p is number => Number.isFinite(p) && (p as number) > 0)
    .sort((a, b) => a - b);
  const paceMin = paces.length ? percentile(paces, 0.05) : 240;
  const paceMax = paces.length ? percentile(paces, 0.95) : 600;
  const paceMid = paces.length ? percentile(paces, 0.5) : (paceMin + paceMax) / 2;

  const alts = samples
    .map((s) => s.alt)
    .filter((a): a is number => typeof a === "number");
  const elevMin = alts.length ? Math.min(...alts) : 0;
  const elevMax = alts.length ? Math.max(...alts) : 0;

  // Build colored segments. Downsample if very long.
  const stride = Math.max(1, Math.floor(samples.length / 1500));
  const segments: ReplaySegment[] = [];
  for (let i = stride; i < samples.length; i += stride) {
    const a = samples[i - stride];
    const b = samples[i];
    const pace = b.paceSecPerKm ?? a.paceSecPerKm ?? paceMid;
    segments.push({
      from: a,
      to: b,
      paceSecPerKm: pace,
      color: paceColor(pace, paceMin, paceMax),
    });
  }

  return {
    samples,
    segments,
    totalMs: samples[samples.length - 1].ms,
    totalDistM: samples[samples.length - 1].distM,
    paceMin,
    paceMax,
    paceMid,
    elevMin,
    elevMax,
  };
}

/** Lightweight wrapper: build heatmap segments directly from raw GeoPoints. */
export function buildPaceSegmentsFromPoints(points: GeoPoint[]): ReplaySegment[] {
  if (!points || points.length < 2) return [];
  return buildReplaySeries({ points, startedAt: points[0].t }).segments;
}

/** Linear interpolate the series at a given elapsed-ms position. */
export function sampleAtMs(series: ReplaySeries, ms: number): ReplaySample | null {
  const arr = series.samples;
  if (arr.length === 0) return null;
  if (ms <= arr[0].ms) return arr[0];
  if (ms >= arr[arr.length - 1].ms) return arr[arr.length - 1];
  let lo = 0;
  let hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (arr[mid].ms <= ms) lo = mid;
    else hi = mid - 1;
  }
  const a = arr[lo];
  const b = arr[Math.min(lo + 1, arr.length - 1)];
  const span = b.ms - a.ms;
  const f = span > 0 ? (ms - a.ms) / span : 0;
  const lerpN = (x: number | null, y: number | null) =>
    x == null || y == null ? (x ?? y) : x + (y - x) * f;
  return {
    t: a.t + (b.t - a.t) * f,
    ms,
    distM: a.distM + (b.distM - a.distM) * f,
    lat: a.lat + (b.lat - a.lat) * f,
    lng: a.lng + (b.lng - a.lng) * f,
    alt: lerpN(a.alt, b.alt),
    paceSecPerKm: lerpN(a.paceSecPerKm, b.paceSecPerKm),
    speedMps: lerpN(a.speedMps, b.speedMps),
  };
}
