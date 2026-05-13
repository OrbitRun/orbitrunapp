// Local snapshot log of recent Performance Prediction values, used to compute
// 30-day trend deltas without recomputing the whole history each render.

import type { PredictionDistance, PredictionMap } from "./performance-prediction";

export type PredictionSnapshot = {
  t: number;
  values: PredictionMap;
};

const KEY = "orbit:prediction-history:v1";
const RATE_LIMIT_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_ENTRIES = 180;
const DAY_MS = 86_400_000;

export function loadHistory(): PredictionSnapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PredictionSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(history: PredictionSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
  } catch {
    /* noop */
  }
}

export function appendSnapshot(values: PredictionMap, now: number = Date.now()): PredictionSnapshot[] {
  if (Object.keys(values).length === 0) return loadHistory();
  const history = loadHistory();
  const last = history[history.length - 1];
  if (last && now - last.t < RATE_LIMIT_MS) return history;
  const next = [...history, { t: now, values }];
  save(next);
  return next;
}

export function snapshotClosestTo(
  history: PredictionSnapshot[],
  targetT: number,
  toleranceDays = 7,
): PredictionSnapshot | null {
  const tol = toleranceDays * DAY_MS;
  let best: PredictionSnapshot | null = null;
  let bestDelta = Infinity;
  for (const s of history) {
    const d = Math.abs(s.t - targetT);
    if (d > tol) continue;
    if (d < bestDelta) {
      best = s;
      bestDelta = d;
    }
  }
  return best;
}

export function monthlyDelta(
  history: PredictionSnapshot[],
  current: PredictionMap,
  distance: PredictionDistance,
  now: number = Date.now(),
): { deltaMs: number; baselineMs: number } | null {
  const cur = current[distance];
  if (cur == null) return null;
  const baseline = snapshotClosestTo(history, now - 30 * DAY_MS);
  const baseVal = baseline?.values[distance];
  if (baseVal == null) return null;
  return { deltaMs: cur - baseVal, baselineMs: baseVal };
}
