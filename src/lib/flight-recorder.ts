// Flight Recorder — debounced localStorage snapshots of an in-progress run so
// crashes, refreshes or coverage drops never lose data. Pure client-side.

import type { GeoPoint, HrSample, Run, RunWeather, Split } from "@/lib/run-types";
import { loadRuns } from "@/lib/run-types";
import { genId } from "@/lib/run-utils";

const KEY = "orbit:flight-recorder:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const MIN_DURATION_MS = 30_000; // 30s minimum to be worth recovering

export type FlightSnapshot = {
  runId: string;
  startedAt: number;
  lastSavedAt: number;
  durationMs: number;
  distanceM: number;
  elevationGainM: number;
  avgPaceSecPerKm: number;
  avgCadenceSpm: number;
  points: GeoPoint[];
  splits: Split[];
  hrSeries?: HrSample[];
  avgHrBpm?: number;
  maxHrBpm?: number;
  weather?: RunWeather;
};

export function saveSnapshot(snap: FlightSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* quota — ignore */
  }
}

export function loadSnapshot(): FlightSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FlightSnapshot;
  } catch {
    return null;
  }
}

export function clearSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function hasRecoverableSnapshot(): FlightSnapshot | null {
  const s = loadSnapshot();
  if (!s) return null;
  const now = Date.now();
  if (now - s.startedAt > MAX_AGE_MS) {
    clearSnapshot();
    return null;
  }
  if (s.durationMs < MIN_DURATION_MS) return null;
  // If a saved Run already exists for this snapshot, no need to recover.
  try {
    const runs = loadRuns();
    if (runs.some((r) => r.id === s.runId)) {
      clearSnapshot();
      return null;
    }
  } catch {
    /* noop */
  }
  return s;
}

export function snapshotToRun(s: FlightSnapshot): Run {
  return {
    id: genId(),
    startedAt: s.startedAt,
    endedAt: s.lastSavedAt,
    durationMs: s.durationMs,
    distanceM: s.distanceM,
    elevationGainM: s.elevationGainM,
    avgPaceSecPerKm: s.avgPaceSecPerKm,
    avgCadenceSpm: s.avgCadenceSpm,
    points: s.points,
    splits: s.splits,
    weather: s.weather,
    hrSeries: s.hrSeries,
    avgHrBpm: s.avgHrBpm,
    maxHrBpm: s.maxHrBpm,
  };
}

// Debounced writer — coalesces frequent updates to ~1 write/sec to avoid
// blocking the main thread under heavy GPS bursts.
export type DebouncedRecorder = {
  queue: (snap: FlightSnapshot) => void;
  flush: () => void;
  cancel: () => void;
};

export function createDebouncedRecorder(intervalMs = 1000): DebouncedRecorder {
  let pending: FlightSnapshot | null = null;
  let timer: number | null = null;
  const write = () => {
    if (pending) {
      saveSnapshot(pending);
      pending = null;
    }
    timer = null;
  };
  return {
    queue(snap) {
      pending = snap;
      if (timer != null) return;
      if (typeof window === "undefined") return;
      timer = window.setTimeout(write, intervalMs);
    },
    flush() {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
      write();
    },
    cancel() {
      if (timer != null && typeof window !== "undefined") {
        window.clearTimeout(timer);
      }
      timer = null;
      pending = null;
    },
  };
}
