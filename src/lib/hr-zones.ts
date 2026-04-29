// Time-in-zone analysis. Pure helpers, no React.

import type { HrSample } from "@/lib/run-types";
import { DEFAULT_MAX_HR, zoneFor, type HrZone } from "@/lib/hr-analysis";

export type ZoneSlice = {
  zone: HrZone;
  ms: number;
  pct: number; // 0..100
};

// Time-weighted breakdown of a heart-rate series across the 5 zones.
// Each sample is weighted by the time interval to its successor — matches
// `timeFractionInZone5` so the post-run engine and the bar chart agree.
export function timeInZones(
  series: HrSample[] | undefined,
  maxHr: number = DEFAULT_MAX_HR,
): ZoneSlice[] {
  const empty: ZoneSlice[] = [1, 2, 3, 4, 5].map((z) => ({ zone: z as HrZone, ms: 0, pct: 0 }));
  if (!series || series.length < 2) return empty;
  const buckets: Record<HrZone, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (let i = 0; i < series.length - 1; i++) {
    const dt = Math.max(0, series[i + 1].t - series[i].t);
    if (dt === 0) continue;
    const z = zoneFor(series[i].bpm, maxHr);
    buckets[z] += dt;
    total += dt;
  }
  if (total === 0) return empty;
  return ([1, 2, 3, 4, 5] as HrZone[]).map((z) => ({
    zone: z,
    ms: buckets[z],
    pct: Math.round((buckets[z] / total) * 1000) / 10,
  }));
}

export function classifyHrrGrade(drop: number): "poor" | "fair" | "good" | "excellent" | "elite" {
  if (drop >= 40) return "elite";
  if (drop >= 30) return "excellent";
  if (drop >= 20) return "good";
  if (drop >= 12) return "fair";
  return "poor";
}
