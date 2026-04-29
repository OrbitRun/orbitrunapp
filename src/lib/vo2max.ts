// VO2 Max estimate ("Orbit Fitness Score").
// Uses the Uth–Sørensen–Overgaard–Pedersen formula:
//   VO2max ≈ 15.3 × (HRmax / HRrest)
//
// This is intentionally a coarse estimate — call it out as such in the UI.
// Returns null when the run isn't long/steady enough to be meaningful.

import type { Run } from "@/lib/run-types";
import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";

const DEFAULT_REST_HR = 60;
const MIN_DURATION_MS = 10 * 60_000; // 10 minutes

export function estimateVo2Max(
  run: Pick<Run, "durationMs" | "avgHrBpm" | "maxHrBpm">,
  opts: { restHr?: number } = {},
): number | null {
  if (run.durationMs < MIN_DURATION_MS) return null;
  if (!run.avgHrBpm || run.avgHrBpm <= 0) return null;
  const maxHr = run.maxHrBpm && run.maxHrBpm > 0 ? run.maxHrBpm : DEFAULT_MAX_HR;
  const rest = opts.restHr ?? DEFAULT_REST_HR;
  if (rest <= 0) return null;
  // Require at least 60% of HRmax avg to ensure the user actually elevated HR.
  if (run.avgHrBpm < maxHr * 0.6) return null;
  const v = 15.3 * (maxHr / rest);
  if (!Number.isFinite(v) || v <= 0) return null;
  return Math.round(v * 10) / 10;
}

export type FitnessBand = "poor" | "fair" | "good" | "excellent" | "elite";

// Generic adult bands — keep simple, no age/gender stratification.
export function classifyFitness(vo2: number): FitnessBand {
  if (vo2 >= 60) return "elite";
  if (vo2 >= 50) return "excellent";
  if (vo2 >= 42) return "good";
  if (vo2 >= 35) return "fair";
  return "poor";
}
