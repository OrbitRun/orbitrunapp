// Performance Prediction — estimate current race times for 5K/10K/half/marathon
// from the last 6 weeks of running, using a recency-weighted Riegel model with
// an endurance-anchor penalty for distances longer than the user's longest run.

import type { Run } from "./run-types";
import { bestTimeForPoints } from "./personal-records";

export type PredictionDistance = "5k" | "10k" | "half" | "marathon";

export const PREDICTION_DISTANCES: { id: PredictionDistance; meters: number }[] = [
  { id: "5k", meters: 5000 },
  { id: "10k", meters: 10000 },
  { id: "half", meters: 21097.5 },
  { id: "marathon", meters: 42195 },
];

export type PredictionMap = Partial<Record<PredictionDistance, number>>;

const WINDOW_MS = 42 * 24 * 60 * 60 * 1000; // 6 weeks
const HALF_LIFE_DAYS = 21;

function riegelExponent(distanceM: number): number {
  return distanceM <= 10000 ? 1.06 : 1.08;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

type Candidate = { tD: number; weight: number };

function candidatesForDistance(
  runs: Run[],
  D: number,
  longestM: number,
  now: number,
): Candidate[] {
  const out: Candidate[] = [];
  const k = riegelExponent(D);
  const enduranceFactor = clamp(1 + Math.max(0, (D - longestM) / D) * 0.04, 1, 1.2);

  for (const r of runs) {
    if (r.distanceM <= 0 || r.durationMs <= 0) continue;
    if (r.distanceM < 0.4 * D) continue;

    let tD: number;
    if (r.distanceM >= D && r.points && r.points.length >= 2) {
      const best = bestTimeForPoints(r.points, D);
      if (best == null || best <= 0) continue;
      tD = best;
    } else {
      // Riegel projection from full run.
      tD = r.durationMs * Math.pow(D / r.distanceM, k);
    }
    tD *= enduranceFactor;

    const ageDays = Math.max(0, (now - r.endedAt) / 86_400_000);
    const recency = Math.exp(-ageDays / HALF_LIFE_DAYS);
    const ratio = D / r.distanceM;
    const quality = 1 / (1 + Math.max(0, ratio - 1)); // <1 when extrapolating up
    const weight = recency * quality;
    if (weight <= 0 || !isFinite(tD)) continue;

    out.push({ tD, weight });
  }
  return out;
}

function aggregate(candidates: Candidate[]): number | null {
  if (candidates.length === 0) return null;
  // Robust min: take the 3 fastest projections (best signal of current form),
  // then weighted-average them.
  const sorted = [...candidates].sort((a, b) => a.tD - b.tD);
  const top = sorted.slice(0, Math.min(3, sorted.length));
  const totalW = top.reduce((s, c) => s + c.weight, 0);
  if (totalW <= 0) return null;
  const weighted = top.reduce((s, c) => s + c.tD * c.weight, 0) / totalW;
  return Math.round(weighted);
}

export function predictRaceTimes(runs: Run[], now: number = Date.now()): PredictionMap {
  const windowed = runs.filter((r) => r.endedAt >= now - WINDOW_MS);
  if (windowed.length < 2) return {};
  const longestM = windowed.reduce((m, r) => Math.max(m, r.distanceM), 0);

  const out: PredictionMap = {};
  for (const { id, meters } of PREDICTION_DISTANCES) {
    const cands = candidatesForDistance(windowed, meters, longestM, now);
    const v = aggregate(cands);
    if (v != null) out[id] = v;
  }
  return out;
}

// True if any run in the user's history has covered at least `distanceM`.
// Used for the marathon "Theoretical potential" badge — we look at all-time
// longest, not just the 6-week window, to be lenient.
export function hasLongRunFor(runs: Run[], distanceM: number): boolean {
  return runs.some((r) => r.distanceM >= distanceM);
}

// Distance below which the marathon estimate is flagged as theoretical.
export const MARATHON_REALISM_MIN_M = 15000;
