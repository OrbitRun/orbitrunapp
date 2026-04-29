// Heart-rate derived analytics: max HR estimate, zones, HRR (heart rate recovery),
// time-in-zone, and aerobic-efficiency comparison vs. recent runs.
//
// Pure functions only — no UI, no side effects.

import type { HrSample, Run } from "@/lib/run-types";

// Default max HR estimate when the user hasn't supplied an age.
// Tuned for a generic adult recreational runner; can be made user-configurable later.
export const DEFAULT_MAX_HR = 190;

export function maxHrFor(_run?: Run): number {
  return DEFAULT_MAX_HR;
}

export type HrZone = 1 | 2 | 3 | 4 | 5;

export function zoneFor(bpm: number, maxHr: number = DEFAULT_MAX_HR): HrZone {
  const pct = bpm / maxHr;
  if (pct >= 0.9) return 5;
  if (pct >= 0.8) return 4;
  if (pct >= 0.7) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}

// Returns the fraction (0..1) of the run that BPM was in Zone 5 (>=90% maxHR).
// Each sample is weighted by the time interval to its successor — matches a
// time-weighted integral rather than a naïve count of samples.
export function timeFractionInZone5(series: HrSample[], maxHr: number = DEFAULT_MAX_HR): number {
  if (!series || series.length < 2) return 0;
  const threshold = maxHr * 0.9;
  let total = 0;
  let inZ5 = 0;
  for (let i = 0; i < series.length - 1; i++) {
    const dt = Math.max(0, series[i + 1].t - series[i].t);
    total += dt;
    if (series[i].bpm >= threshold) inZ5 += dt;
  }
  if (total === 0) return 0;
  return inZ5 / total;
}

// Heart-rate recovery: BPM drop from the moment of stop to ~60s later.
// Returns null when not enough post-stop data was captured.
export function hrrDrop60s(postStop: HrSample[]): number | null {
  if (!postStop || postStop.length < 2) return null;
  const t0 = postStop[0].t;
  const start = postStop[0].bpm;
  // Find sample closest to t0 + 60s.
  let target = postStop[postStop.length - 1];
  for (const s of postStop) {
    if (s.t - t0 >= 60_000) {
      target = s;
      break;
    }
  }
  if (target.t - t0 < 30_000) return null; // need at least 30s of data
  const drop = start - target.bpm;
  return Math.max(0, Math.round(drop));
}

export type HrrInsight =
  | { key: "hrr.strong"; drop: number }
  | { key: "hrr.normal"; drop: number }
  | { key: "hrr.weak"; drop: number };

export function classifyHrr(drop: number): HrrInsight {
  if (drop >= 30) return { key: "hrr.strong", drop };
  if (drop >= 20) return { key: "hrr.normal", drop };
  return { key: "hrr.weak", drop };
}

// Aerobic efficiency: same pace, lower HR over time means improving fitness.
// Compares this run's avgHR to the median avgHR of similar past runs (close
// pace and distance) within the last 60 days. Returns a positive `bpmDelta`
// when the user is now lower than the baseline (i.e. more efficient).
export type AerobicEfficiencyInsight = {
  bpmDelta: number; // positive = lower HR than baseline (good)
  baselineBpm: number;
  pace: number; // sec/km
  comparedRuns: number;
};

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export function aerobicEfficiency(run: Run, history: Run[]): AerobicEfficiencyInsight | null {
  if (!run.avgHrBpm || run.avgHrBpm <= 0) return null;
  if (!run.avgPaceSecPerKm || run.avgPaceSecPerKm <= 0) return null;
  if (run.distanceM < 1500) return null; // too short to be meaningful

  const cutoff = run.startedAt - SIXTY_DAYS_MS;
  const similar = history.filter(
    (r) =>
      r.id !== run.id &&
      r.startedAt >= cutoff &&
      r.startedAt < run.startedAt &&
      r.avgHrBpm != null &&
      r.avgHrBpm > 0 &&
      r.avgPaceSecPerKm > 0 &&
      Math.abs(r.avgPaceSecPerKm - run.avgPaceSecPerKm) <= 10 && // ±10 sec/km
      r.distanceM >= run.distanceM * 0.7 &&
      r.distanceM <= run.distanceM * 1.3,
  );
  if (similar.length < 2) return null;

  const hrs = similar.map((r) => r.avgHrBpm!).sort((a, b) => a - b);
  const baseline = hrs[Math.floor(hrs.length / 2)];
  const delta = baseline - run.avgHrBpm;
  if (delta < 5) return null; // require ≥5 bpm improvement to surface
  return {
    bpmDelta: Math.round(delta),
    baselineBpm: Math.round(baseline),
    pace: run.avgPaceSecPerKm,
    comparedRuns: similar.length,
  };
}
