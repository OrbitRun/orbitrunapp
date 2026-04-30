// Flight Recorder: persist live run state to localStorage on every mutation
// (debounced) so a crash, refresh, or app kill never loses an in-flight run.
// On boot we surface a one-time "recover unsaved run?" banner.

import type { GeoPoint, HrSample, Run, RunWeather, Split } from "@/lib/run-types";
import { genId } from "@/lib/run-utils";
import { loadRuns } from "@/lib/run-types";

export type FlightSnapshot = {
  runId: string;
  startedAt: number;
  endedAt: number; // last known activity time
  durationMs: number;
  distanceM: number;
  elevationGainM: number;
  points: GeoPoint[];
  splits: Split[];
  hrSeries: HrSample[];
  weather?: RunWeather;
  shoeId?: string;
  avgHrBpm?: number;
  maxHrBpm?: number;
  lastSavedAt: number;
};

const KEY = "orbit:flight-recorder:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const MIN_DURATION_MS = 30_000; // require ≥30s of data to bother prompting
const MIN_DISTANCE_M = 50;

export function saveSnapshot(s: FlightSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...s, lastSavedAt: Date.now() }));
  } catch {
    /* quota / private mode — silently ignore */
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

// True when the snapshot looks like a real run worth offering for recovery
// AND no Run with that id has already been saved (covers the case where the
// user manages to stop normally and then somehow we forgot to clear).
export function hasRecoverableSnapshot(): FlightSnapshot | null {
  const s = loadSnapshot();
  if (!s) return null;
  if (Date.now() - s.startedAt > MAX_AGE_MS) {
    clearSnapshot();
    return null;
  }
  if (s.durationMs < MIN_DURATION_MS || s.distanceM < MIN_DISTANCE_M) {
    return null;
  }
  // If a Run with this id is already saved, just clean up.
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
  const distanceM = s.distanceM;
  const durationMs = s.durationMs;
  const avgPace =
    distanceM > 50 && durationMs > 0
      ? durationMs / 1000 / (distanceM / 1000)
      : 0;
  const avgCadenceSpm = avgPace > 0 ? Math.round(180 - Math.min(20, (avgPace - 240) / 12)) : 168;
  const run: Run = {
    id: s.runId || genId(),
    startedAt: s.startedAt,
    endedAt: s.endedAt || s.lastSavedAt || Date.now(),
    durationMs,
    distanceM,
    elevationGainM: s.elevationGainM,
    avgPaceSecPerKm: avgPace,
    avgCadenceSpm,
    points: s.points,
    splits: s.splits,
    weather: s.weather,
    shoeId: s.shoeId,
    avgHrBpm: s.avgHrBpm,
    maxHrBpm: s.maxHrBpm,
    hrSeries: s.hrSeries.length > 0 ? s.hrSeries : undefined,
  };
  return run;
}

// Idle-callback debounced writer so heavy GPS bursts don't stall the main thread.
type IdleHandle = number;
type IdleCallback = (deadline: IdleDeadline) => void;
interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}
type IdleAPI = {
  request: (cb: IdleCallback, opts?: { timeout: number }) => IdleHandle;
  cancel: (h: IdleHandle) => void;
};

function getIdleAPI(): IdleAPI {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const w = window as unknown as {
      requestIdleCallback: IdleAPI["request"];
      cancelIdleCallback: IdleAPI["cancel"];
    };
    return { request: w.requestIdleCallback.bind(w), cancel: w.cancelIdleCallback.bind(w) };
  }
  return {
    request: (cb: IdleCallback, opts) =>
      window.setTimeout(
        () => cb({ didTimeout: true, timeRemaining: () => 0 }),
        opts?.timeout ?? 1000,
      ) as unknown as IdleHandle,
    cancel: (h: IdleHandle) => window.clearTimeout(h as unknown as number),
  };
}

export function createDebouncedRecorder(intervalMs = 1000) {
  let pending: FlightSnapshot | null = null;
  let handle: IdleHandle | null = null;
  let lastWrite = 0;
  const idle = getIdleAPI();

  const flush = () => {
    if (pending) {
      saveSnapshot(pending);
      lastWrite = Date.now();
      pending = null;
    }
    handle = null;
  };

  return {
    queue(snapshot: FlightSnapshot) {
      pending = snapshot;
      if (handle != null) return;
      const since = Date.now() - lastWrite;
      const delay = Math.max(0, intervalMs - since);
      handle = idle.request(flush, { timeout: delay + 500 });
      // Force flush when overdue
      if (delay === 0) {
        if (handle != null) idle.cancel(handle);
        flush();
      }
    },
    flushNow() {
      if (handle != null) {
        idle.cancel(handle);
        handle = null;
      }
      flush();
    },
    cancel() {
      if (handle != null) {
        idle.cancel(handle);
        handle = null;
      }
      pending = null;
    },
  };
}
