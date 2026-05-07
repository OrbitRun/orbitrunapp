// VO2 Max estimate ("Orbit Fitness Score").
//
// Two estimators are exposed:
//
//   1. estimateVo2Max(run, opts?)  — Uth–Sørensen–Overgaard–Pedersen formula
//      based on HRmax / HRrest. Requires heart-rate data.
//
//   2. estimateVo2MaxFromPace(run) — Daniels/ACSM-style pace-based estimate
//      that derives VO2max from the average running speed and duration.
//      Works WITHOUT heart-rate data, so it's the fallback when only GPS
//      is available.
//
// Both return null when the run is too short or doesn't contain enough
// signal to be meaningful.

import type { Run } from "@/lib/run-types";
import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";
import { effectiveMaxHr, type CoachConfig } from "@/lib/user-profile";

const DEFAULT_REST_HR = 60;
const MIN_DURATION_MS = 10 * 60_000; // 10 minutes
const MIN_PACE_DURATION_MS = 8 * 60_000; // pace estimator: 8 min minimum
const MIN_PACE_DISTANCE_M = 1500;

export function estimateVo2Max(
  run: Pick<Run, "durationMs" | "avgHrBpm" | "maxHrBpm">,
  opts: { restHr?: number; maxHr?: number } = {},
): number | null {
  if (run.durationMs < MIN_DURATION_MS) return null;
  if (!run.avgHrBpm || run.avgHrBpm <= 0) return null;
  const maxHr =
    (run.maxHrBpm && run.maxHrBpm > 0 ? run.maxHrBpm : undefined) ??
    opts.maxHr ??
    DEFAULT_MAX_HR;
  const rest = opts.restHr ?? DEFAULT_REST_HR;
  if (rest <= 0) return null;
  if (run.avgHrBpm < maxHr * 0.6) return null;
  const v = 15.3 * (maxHr / rest);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

// Daniels' running-economy + race-intensity model.
//   VO2 (ml/kg/min) used at speed v (m/min):
//     VO2 = -4.60 + 0.182258·v + 0.000104·v²
//   Fraction of VO2max sustained for duration t (minutes):
//     %VO2max = 0.8 + 0.1894393·e^(-0.012778·t) + 0.2989558·e^(-0.1932605·t)
//   VO2max = VO2 / %VO2max
export function estimateVo2MaxFromPace(
  run: Pick<Run, "durationMs" | "distanceM" | "avgPaceSecPerKm">,
): number | null {
  if (run.durationMs < MIN_PACE_DURATION_MS) return null;
  if (run.distanceM < MIN_PACE_DISTANCE_M) return null;
  const pace = run.avgPaceSecPerKm;
  if (!pace || pace <= 0) return null;
  const speedMmin = 1000 / (pace / 60); // meters per minute
  if (speedMmin < 100 || speedMmin > 500) return null; // sanity bounds
  const vo2 = -4.6 + 0.182258 * speedMmin + 0.000104 * speedMmin * speedMmin;
  if (vo2 <= 0) return null;
  const tMin = run.durationMs / 60_000;
  const pct =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * tMin) +
    0.2989558 * Math.exp(-0.1932605 * tMin);
  if (pct <= 0) return null;
  const vo2max = vo2 / pct;
  if (!Number.isFinite(vo2max) || vo2max < 20 || vo2max > 90) return null;
  return Math.round(vo2max * 10) / 10;
}

// Best-effort estimate combining HR-based and pace-based methods.
export function bestEstimateVo2Max(
  run: Pick<Run, "durationMs" | "distanceM" | "avgPaceSecPerKm" | "avgHrBpm" | "maxHrBpm">,
): number | null {
  return estimateVo2Max(run) ?? estimateVo2MaxFromPace(run);
}

// Same as bestEstimateVo2Max but also reports which estimator succeeded.
export type Vo2MaxSource = "hr" | "pace";
export function bestEstimateVo2MaxWithSource(
  run: Pick<Run, "durationMs" | "distanceM" | "avgPaceSecPerKm" | "avgHrBpm" | "maxHrBpm">,
): { value: number; source: Vo2MaxSource } | null {
  const hr = estimateVo2Max(run);
  if (hr != null) return { value: hr, source: "hr" };
  const pace = estimateVo2MaxFromPace(run);
  if (pace != null) return { value: pace, source: "pace" };
  return null;
}

// All-time best across a run history. Returns the run id and value or null.
export function bestVo2MaxFromRuns(
  runs: Pick<Run, "id" | "endedAt" | "durationMs" | "distanceM" | "avgPaceSecPerKm" | "avgHrBpm" | "maxHrBpm" | "vo2maxEst">[],
): { value: number; runId: string; achievedAt: number } | null {
  let best: { value: number; runId: string; achievedAt: number } | null = null;
  for (const r of runs) {
    const v = r.vo2maxEst ?? bestEstimateVo2Max(r);
    if (v == null) continue;
    if (!best || v > best.value) {
      best = { value: v, runId: r.id, achievedAt: r.endedAt };
    }
  }
  return best;
}

export type FitnessBand = "poor" | "fair" | "good" | "excellent" | "elite";

// Generic adult bands — used when age/gender are unknown.
export function classifyFitness(vo2: number): FitnessBand {
  if (vo2 >= 60) return "elite";
  if (vo2 >= 50) return "excellent";
  if (vo2 >= 42) return "good";
  if (vo2 >= 35) return "fair";
  return "poor";
}

// Age- and gender-stratified bands (Cooper Institute / ACSM-derived simplifications).
// Returns the user-friendly band label given a VO2max.
export type Gender = "male" | "female" | "other";

type BandThresholds = { excellent: number; good: number; average: number; fair: number };

// [excellent, good, average, fair] — anything below `fair` is "poor".
function bandsFor(age: number, gender: Gender): BandThresholds {
  // Female bands trend ~5–7 lower than male at equivalent age.
  const male: Array<[number, BandThresholds]> = [
    [29, { excellent: 53, good: 49, average: 43, fair: 36 }],
    [39, { excellent: 49, good: 45, average: 39, fair: 33 }],
    [49, { excellent: 45, good: 42, average: 36, fair: 31 }],
    [59, { excellent: 42, good: 38, average: 33, fair: 28 }],
    [200, { excellent: 38, good: 34, average: 30, fair: 25 }],
  ];
  const female: Array<[number, BandThresholds]> = [
    [29, { excellent: 49, good: 44, average: 38, fair: 31 }],
    [39, { excellent: 45, good: 41, average: 35, fair: 29 }],
    [49, { excellent: 42, good: 38, average: 32, fair: 27 }],
    [59, { excellent: 38, good: 34, average: 29, fair: 24 }],
    [200, { excellent: 35, good: 31, average: 27, fair: 22 }],
  ];
  const table = gender === "female" ? female : male;
  for (const [maxAge, b] of table) {
    if (age <= maxAge) return b;
  }
  return table[table.length - 1][1];
}

export function classifyFitnessByProfile(
  vo2: number,
  age: number | undefined,
  gender: Gender | undefined,
): FitnessBand {
  if (!age || !gender || gender === "other") return classifyFitness(vo2);
  const b = bandsFor(age, gender);
  if (vo2 >= b.excellent) return "elite";
  if (vo2 >= b.good) return "excellent";
  if (vo2 >= b.average) return "good";
  if (vo2 >= b.fair) return "fair";
  return "poor";
}
