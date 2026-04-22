// Personal best computation across stored runs.
// PR for a target distance D = fastest contiguous segment >= D within any run.
// We approximate by scanning each run's GPS points using haversine cumulative distance.

import type { Run, GeoPoint } from "@/lib/run-types";
import { haversine } from "@/lib/run-utils";

export type PRDistance = "5k" | "10k" | "half" | "full";

export const PR_DISTANCES: { id: PRDistance; meters: number; labelKey: string }[] = [
  { id: "5k", meters: 5000, labelKey: "pr.5k" },
  { id: "10k", meters: 10000, labelKey: "pr.10k" },
  { id: "half", meters: 21097.5, labelKey: "pr.half" },
  { id: "full", meters: 42195, labelKey: "pr.full" },
];

export type PersonalBest = {
  id: PRDistance;
  meters: number;
  durationMs: number;
  achievedAt: number; // run startedAt
};

function bestSegmentDuration(points: GeoPoint[], targetM: number): number | null {
  if (points.length < 2) return null;
  // Build cumulative distance + time arrays
  const cumD: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumD.push(cumD[i - 1] + haversine(points[i - 1], points[i]));
  }
  if (cumD[cumD.length - 1] < targetM) return null;

  let best = Infinity;
  let j = 0;
  for (let i = 0; i < points.length; i++) {
    if (j < i) j = i;
    while (j < points.length && cumD[j] - cumD[i] < targetM) j++;
    if (j >= points.length) break;
    // Linear-interpolate j to land exactly on targetM
    const overshoot = cumD[j] - cumD[i] - targetM;
    const segD = cumD[j] - cumD[j - 1];
    const ratio = segD > 0 ? 1 - overshoot / segD : 1;
    const tEnd = points[j - 1].t + (points[j].t - points[j - 1].t) * ratio;
    const dur = tEnd - points[i].t;
    if (dur > 0 && dur < best) best = dur;
  }
  return Number.isFinite(best) ? best : null;
}

export function computePersonalBests(runs: Run[]): PersonalBest[] {
  const out: PersonalBest[] = [];
  for (const target of PR_DISTANCES) {
    let best: PersonalBest | null = null;
    for (const r of runs) {
      // Fast skip
      if (r.distanceM < target.meters) continue;
      const dur = bestSegmentDuration(r.points, target.meters);
      if (dur != null && (!best || dur < best.durationMs)) {
        best = {
          id: target.id,
          meters: target.meters,
          durationMs: dur,
          achievedAt: r.startedAt,
        };
      }
    }
    if (best) out.push(best);
  }
  return out;
}
