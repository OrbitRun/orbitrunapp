// Daily Readiness engine. Pure: combines resting HR, HRV, recent training
// load (TRIMP) and current weather into a 0–100 score plus a coaching key.

import type { Run } from "@/lib/run-types";
import type { Vitals } from "@/lib/vitals";
import { vitalsBaseline } from "@/lib/vitals";
import type { HrZoneConfig } from "@/lib/hr-zones-config";
import type { CurrentEnv } from "@/hooks/use-current-env";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReadinessBand = "rest" | "easy" | "ready" | "prime";

export type ReadinessRecommendationKey =
  | "readiness.rec.rest"
  | "readiness.rec.easy"
  | "readiness.rec.go"
  | "readiness.rec.heatAdjust"
  | "readiness.rec.coldAdjust"
  | "readiness.rec.firstRun"
  | "readiness.rec.missingData";

export type ReadinessResult = {
  score: number; // 0..100
  band: ReadinessBand;
  components: {
    recovery: number; // 0..25
    hrv: number; // 0..25
    load: number; // 0..30
    weather: number; // 0..20
  };
  trimp7d: number;
  trimp3d: number;
  trimp28d: number;
  loadRatio: number; // acute / chronic
  loadTrendPct: number; // % vs prior 7 days
  recommendationKey: ReadinessRecommendationKey;
  recommendationParams?: Record<string, string | number>;
  paceAdjustSecPerKm: number; // recommended adjustment for current weather
  missingVitals: boolean;
};

// ---- TRIMP -----------------------------------------------------------------

/**
 * Banister TRIMP. duration in min × HRr × 0.64 × e^(1.92×HRr).
 * Fallback to duration × rpe when HR not present.
 */
export function computeTrimp(
  run: Pick<Run, "durationMs" | "avgHrBpm" | "rpe">,
  hr?: { restingHr: number; maxHr: number } | null,
): number {
  const minutes = Math.max(0, run.durationMs / 60000);
  if (minutes === 0) return 0;
  if (run.avgHrBpm && hr && hr.maxHr > hr.restingHr) {
    const hrr = Math.max(0, Math.min(1, (run.avgHrBpm - hr.restingHr) / (hr.maxHr - hr.restingHr)));
    return Math.round(minutes * hrr * 0.64 * Math.exp(1.92 * hrr));
  }
  const rpe = typeof run.rpe === "number" ? run.rpe : 5;
  return Math.round(minutes * (rpe / 2));
}

export function trimpInWindow(runs: Run[], days: number, now = Date.now()): number {
  const cutoff = now - days * DAY_MS;
  return runs
    .filter((r) => r.endedAt >= cutoff)
    .reduce((sum, r) => sum + (r.trimp ?? 0), 0);
}

// ---- Score -----------------------------------------------------------------

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function bandFor(score: number): ReadinessBand {
  if (score < 50) return "rest";
  if (score < 70) return "easy";
  if (score < 85) return "ready";
  return "prime";
}

type Inputs = {
  runs: Run[];
  vitals: Vitals;
  hrZones: HrZoneConfig | null;
  env: CurrentEnv | null;
  now?: number;
};

export function computeReadiness({ runs, vitals, hrZones, env, now = Date.now() }: Inputs): ReadinessResult {
  // ---- Load (acute vs chronic, Banister-style) ----
  const trimp3d = trimpInWindow(runs, 3, now);
  const trimp7d = trimpInWindow(runs, 7, now);
  const trimp28d = trimpInWindow(runs, 28, now);
  const trimpPrev7 = trimpInWindow(runs.filter((r) => r.endedAt < now - 7 * DAY_MS), 7, now);
  const chronicDaily = trimp28d / 28;
  const acuteDaily = trimp3d / 3;
  const loadRatio = chronicDaily > 0 ? acuteDaily / chronicDaily : 0;
  const loadTrendPct =
    trimpPrev7 > 0 ? Math.round(((trimp7d - trimpPrev7) / trimpPrev7) * 100) : 0;

  // 30 pts: best at 0.8–1.2; 0 pts at >=2.0 or first-run
  let load = 30;
  if (chronicDaily === 0) {
    load = 22; // first-run / unseeded — give benefit of the doubt
  } else if (loadRatio >= 2.0) load = 0;
  else if (loadRatio >= 1.5) load = 10;
  else if (loadRatio >= 1.3) load = 18;
  else if (loadRatio >= 0.8 && loadRatio <= 1.2) load = 30;
  else if (loadRatio < 0.5) load = 24; // very low load — fresh
  else load = 26;

  // ---- Recovery (resting HR vs 28d baseline) ----
  const baseline = vitalsBaseline(vitals, 28, now);
  let recovery = 18;
  const rhr = vitals.restingHr;
  if (rhr && baseline.restingHr > 0) {
    const delta = rhr - baseline.restingHr;
    // +0 = perfect, +5 = -10pt, -3 = +small bonus
    recovery = clamp(25 - delta * 1.8, 0, 25);
  } else if (rhr) {
    recovery = 20;
  } else {
    recovery = 18; // no signal yet
  }

  // ---- HRV (today vs 28d baseline; higher = better) ----
  let hrv = 18;
  const v = vitals.hrvMs;
  if (v && baseline.hrvMs > 0) {
    const delta = v - baseline.hrvMs; // positive = better
    hrv = clamp(20 + delta * 1.0, 0, 25);
  } else if (v) {
    hrv = 20;
  } else {
    hrv = 18;
  }

  // ---- Weather ----
  let weather = 20;
  let paceAdjust = 0;
  let envKey: ReadinessRecommendationKey | null = null;
  if (env) {
    const apparent = env.apparentTempC;
    if (apparent >= 18) {
      const above = apparent - 18;
      paceAdjust += Math.round((above / 5) * 15); // +15s/km per 5°C above 18
    }
    if (env.humidityPct >= 70 && apparent >= 16) paceAdjust += 8;
    if (env.windMs >= 8) paceAdjust += 4;

    if (apparent >= 28) weather = 4;
    else if (apparent >= 24) weather = 10;
    else if (apparent >= 20) weather = 16;
    else if (apparent <= -5) {
      weather = 12;
      envKey = "readiness.rec.coldAdjust";
    } else weather = 20;
    if (apparent >= 24) envKey = "readiness.rec.heatAdjust";
  }

  const score = Math.round(recovery + hrv + load + weather);
  const band = bandFor(score);

  // ---- Recommendation copy ----
  const missingVitals = !vitals.restingHr && !vitals.hrvMs;
  let recommendationKey: ReadinessRecommendationKey;
  let recommendationParams: Record<string, string | number> | undefined;
  if (runs.length === 0) {
    recommendationKey = "readiness.rec.firstRun";
  } else if (band === "rest") {
    recommendationKey = "readiness.rec.rest";
    recommendationParams = { score };
  } else if (band === "easy") {
    recommendationKey = "readiness.rec.easy";
    recommendationParams = { score };
  } else if (envKey === "readiness.rec.heatAdjust" && paceAdjust > 0) {
    recommendationKey = "readiness.rec.heatAdjust";
    recommendationParams = { temp: env!.apparentTempC, humidity: env!.humidityPct, pace: paceAdjust };
  } else if (envKey === "readiness.rec.coldAdjust") {
    recommendationKey = "readiness.rec.coldAdjust";
    recommendationParams = { temp: env!.apparentTempC };
  } else {
    recommendationKey = "readiness.rec.go";
    recommendationParams = { score };
  }

  return {
    score,
    band,
    components: { recovery: Math.round(recovery), hrv: Math.round(hrv), load, weather },
    trimp3d,
    trimp7d,
    trimp28d,
    loadRatio: Math.round(loadRatio * 100) / 100,
    loadTrendPct,
    recommendationKey,
    recommendationParams,
    paceAdjustSecPerKm: paceAdjust,
    missingVitals,
  };
}
