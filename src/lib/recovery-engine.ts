// Personal Recovery Engine
// Pure, deterministic functions over Run history. No UI, no side effects.
// Returns i18n keys + interpolation params, not localized strings.

import type { Run } from "@/lib/run-types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const WINDOW_MS = 28 * DAY_MS;

export type RecoveryScenario =
  | "firstRun"
  | "maintenance"
  | "overreaching"
  | "recovery";

export type RecoveryHeadline =
  | { key: "recovery.headline.longestInWeeks"; weeks: number }
  | { key: "recovery.headline.fastestInWeeks"; weeks: number }
  | { key: "recovery.headline.normalLoad" }
  | { key: "recovery.headline.recoveryRun" }
  | { key: "recovery.headline.firstRun" };

export type RecoveryScenarioMessage =
  | { key: "recovery.scenario.maintenance" }
  | { key: "recovery.scenario.overreaching.distance"; pct: number }
  | { key: "recovery.scenario.overreaching.pace" }
  | { key: "recovery.scenario.overreaching.both" }
  | { key: "recovery.scenario.recovery" }
  | { key: "recovery.scenario.firstRun" }
  | { key: "recovery.scenario.zone5"; pct: number };

export type Baseline = {
  weeklyAvgKm: number;
  avgRunKm: number;
  easyPaceSecPerKm: number; // 0 when unknown
  runCount28d: number;
};

export type RunAnalysis = {
  scenario: RecoveryScenario;
  headline: RecoveryHeadline;
  message: RecoveryScenarioMessage;
  recommendedHours: number;
  distanceRatio: number; // run distance vs avg run distance
  paceDelta: number; // easy − run (positive = faster than easy)
  rpe: number;
  baseline: Baseline;
};

export type RecoveryStatus = {
  hoursRemaining: number;
  totalHours: number;
  readyAt: number; // ms timestamp
  status: "ready" | "recovering" | "rest";
  lastRunAt: number;
  analysis: RunAnalysis;
};

// ---- Baseline ----------------------------------------------------------

export function computeBaseline(history: Run[], now: number = Date.now()): Baseline {
  const cutoff = now - WINDOW_MS;
  const recent = history.filter((r) => r.startedAt >= cutoff && r.distanceM > 0);
  if (recent.length === 0) {
    return { weeklyAvgKm: 0, avgRunKm: 0, easyPaceSecPerKm: 0, runCount28d: 0 };
  }

  const totalKm = recent.reduce((acc, r) => acc + r.distanceM / 1000, 0);
  const avgRunKm = totalKm / recent.length;
  const weeklyAvgKm = totalKm / (WINDOW_MS / WEEK_MS);

  // Easy pace estimate: median pace of the slower 60% of runs (excludes hard sessions).
  const paces = recent
    .map((r) => r.avgPaceSecPerKm)
    .filter((p) => p > 0)
    .sort((a, b) => b - a); // slowest first
  let easyPaceSecPerKm = 0;
  if (paces.length > 0) {
    const cut = Math.max(1, Math.floor(paces.length * 0.6));
    const slower = paces.slice(0, cut);
    easyPaceSecPerKm = slower[Math.floor(slower.length / 2)] ?? paces[0];
  }

  return {
    weeklyAvgKm: Math.round(weeklyAvgKm * 10) / 10,
    avgRunKm: Math.round(avgRunKm * 100) / 100,
    easyPaceSecPerKm: Math.round(easyPaceSecPerKm),
    runCount28d: recent.length,
  };
}

// ---- Per-run analysis --------------------------------------------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundHours(h: number): number {
  // Snap to 12 / 24 / 36 / 48 / 72.
  const buckets = [12, 24, 36, 48, 72];
  return buckets.reduce((best, b) => (Math.abs(b - h) < Math.abs(best - h) ? b : best), buckets[0]);
}

function weeksSinceLongerRun(run: Run, history: Run[]): number {
  const prior = history.filter((r) => r.id !== run.id && r.startedAt < run.startedAt);
  if (prior.length === 0) return 0;
  let mostRecentLonger = 0;
  for (const r of prior) {
    if (r.distanceM >= run.distanceM) {
      if (r.startedAt > mostRecentLonger) mostRecentLonger = r.startedAt;
    }
  }
  if (mostRecentLonger === 0) {
    // No prior run was longer — measure span back to oldest
    const oldest = Math.min(...prior.map((r) => r.startedAt));
    return Math.max(1, Math.floor((run.startedAt - oldest) / WEEK_MS));
  }
  return Math.floor((run.startedAt - mostRecentLonger) / WEEK_MS);
}

function weeksSinceFasterRun(run: Run, history: Run[]): number {
  const prior = history.filter(
    (r) => r.id !== run.id && r.startedAt < run.startedAt && r.avgPaceSecPerKm > 0 && r.distanceM >= run.distanceM * 0.6,
  );
  if (prior.length === 0) return 0;
  let mostRecentFaster = 0;
  for (const r of prior) {
    if (r.avgPaceSecPerKm <= run.avgPaceSecPerKm) {
      if (r.startedAt > mostRecentFaster) mostRecentFaster = r.startedAt;
    }
  }
  if (mostRecentFaster === 0) {
    const oldest = Math.min(...prior.map((r) => r.startedAt));
    return Math.max(1, Math.floor((run.startedAt - oldest) / WEEK_MS));
  }
  return Math.floor((run.startedAt - mostRecentFaster) / WEEK_MS);
}

export function analyzeRun(run: Run, history: Run[]): RunAnalysis {
  // Baseline excludes the run being analyzed.
  const baseline = computeBaseline(
    history.filter((r) => r.id !== run.id),
    run.startedAt,
  );

  const rpe = typeof run.rpe === "number" ? run.rpe : 5;
  const runKm = run.distanceM / 1000;

  // First-run path
  if (baseline.runCount28d === 0) {
    return {
      scenario: "firstRun",
      headline: { key: "recovery.headline.firstRun" },
      message: { key: "recovery.scenario.firstRun" },
      recommendedHours: 24,
      distanceRatio: 1,
      paceDelta: 0,
      rpe,
      baseline,
    };
  }

  const distanceRatio = clamp(runKm / Math.max(baseline.avgRunKm, 0.5), 0.3, 3);
  const paceDelta =
    baseline.easyPaceSecPerKm > 0 && run.avgPaceSecPerKm > 0
      ? baseline.easyPaceSecPerKm - run.avgPaceSecPerKm
      : 0;

  let hours = 24;
  const longer = distanceRatio > 1.2;
  const faster = paceDelta > 20;
  const shorter = distanceRatio < 0.7;
  const slower = paceDelta < -15;

  if (longer) hours += 12;
  if (faster) hours += 12;
  if (rpe >= 8 && (longer || faster)) hours = Math.round(hours * 1.25);
  if (shorter && slower) hours -= 6;
  if (rpe <= 3) hours -= 4;

  hours = clamp(hours, 12, 72);
  const recommendedHours = roundHours(hours);

  // Scenario classification
  let scenario: RecoveryScenario = "maintenance";
  let message: RecoveryScenarioMessage = { key: "recovery.scenario.maintenance" };
  let headline: RecoveryHeadline = { key: "recovery.headline.normalLoad" };

  if (shorter && slower) {
    scenario = "recovery";
    message = { key: "recovery.scenario.recovery" };
    headline = { key: "recovery.headline.recoveryRun" };
  } else if (longer && faster) {
    scenario = "overreaching";
    message = { key: "recovery.scenario.overreaching.both" };
    const w = weeksSinceLongerRun(run, history);
    headline = w >= 1 ? { key: "recovery.headline.longestInWeeks", weeks: w } : { key: "recovery.headline.normalLoad" };
  } else if (longer) {
    scenario = "overreaching";
    const pct = Math.round((distanceRatio - 1) * 100);
    message = { key: "recovery.scenario.overreaching.distance", pct };
    const w = weeksSinceLongerRun(run, history);
    headline = w >= 1 ? { key: "recovery.headline.longestInWeeks", weeks: w } : { key: "recovery.headline.normalLoad" };
  } else if (faster) {
    scenario = "overreaching";
    message = { key: "recovery.scenario.overreaching.pace" };
    const w = weeksSinceFasterRun(run, history);
    headline = w >= 1 ? { key: "recovery.headline.fastestInWeeks", weeks: w } : { key: "recovery.headline.normalLoad" };
  }

  // Zone-5 stress override: if pulse spent >15% of the run at ≥90% maxHR,
  // the cardiovascular system needs more time regardless of subjective RPE.
  const z5 = typeof run.zone5PctTime === "number" ? run.zone5PctTime : 0;
  const z5Override = z5 > 15;
  if (z5Override) {
    hours = Math.max(hours, 36);
    scenario = "overreaching";
    message = { key: "recovery.scenario.zone5", pct: Math.round(z5) };
    if (headline.key === "recovery.headline.normalLoad") {
      headline = { key: "recovery.headline.normalLoad" };
    }
  }
  hours = clamp(hours, 12, 72);
  const finalHours = roundHours(hours);

  return {
    scenario,
    headline,
    message,
    recommendedHours: finalHours,
    distanceRatio,
    paceDelta,
    rpe,
    baseline,
  };
}

// ---- Dashboard status --------------------------------------------------

export function recoveryStatus(history: Run[], now: number = Date.now()): RecoveryStatus | null {
  if (history.length === 0) return null;
  // Most recent run by startedAt
  const sorted = [...history].sort((a, b) => b.startedAt - a.startedAt);
  const last = sorted[0];
  const analysis = analyzeRun(last, history);
  const totalMs = analysis.recommendedHours * 60 * 60 * 1000;
  const readyAt = last.endedAt + totalMs;
  const remainingMs = Math.max(0, readyAt - now);
  const hoursRemaining = Math.ceil(remainingMs / (60 * 60 * 1000));

  let status: RecoveryStatus["status"];
  if (remainingMs === 0) status = "ready";
  else if (analysis.recommendedHours >= 48) status = "rest";
  else status = "recovering";

  return {
    hoursRemaining,
    totalHours: analysis.recommendedHours,
    readyAt,
    status,
    lastRunAt: last.startedAt,
    analysis,
  };
}
