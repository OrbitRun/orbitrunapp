// Metric registry for the customizable stat grid.
// Each metric knows how to render its current value from the live tracker state.

import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";

export type MetricId = "distance" | "duration" | "pace" | "avgPace" | "cadence" | "elevation";

export type LiveStats = {
  distanceM: number;
  elapsedMs: number;
  currentPaceSecPerKm: number;
  avgPaceSecPerKm: number;
  cadenceSpm: number;
  elevationGainM: number;
};

export type MetricDef = {
  id: MetricId;
  labelKey: string;
  unitKey?: string;
  format: (s: LiveStats) => string;
};

export const METRICS: Record<MetricId, MetricDef> = {
  distance: {
    id: "distance",
    labelKey: "stat.distance",
    unitKey: "unit.km",
    format: (s) => formatDistance(s.distanceM),
  },
  duration: {
    id: "duration",
    labelKey: "stat.duration",
    format: (s) => formatDuration(s.elapsedMs),
  },
  pace: {
    id: "pace",
    labelKey: "stat.pace",
    unitKey: "unit.perKm",
    format: (s) => formatPace(s.currentPaceSecPerKm || s.avgPaceSecPerKm),
  },
  avgPace: {
    id: "avgPace",
    labelKey: "stat.avgPace",
    unitKey: "unit.perKm",
    format: (s) => formatPace(s.avgPaceSecPerKm),
  },
  cadence: {
    id: "cadence",
    labelKey: "stat.cadence",
    unitKey: "unit.spm",
    format: (s) => String(s.cadenceSpm),
  },
  elevation: {
    id: "elevation",
    labelKey: "stat.elev",
    unitKey: "unit.m",
    format: (s) => Math.round(s.elevationGainM).toString(),
  },
};

export const ALL_METRIC_IDS: MetricId[] = [
  "distance",
  "duration",
  "pace",
  "avgPace",
  "cadence",
  "elevation",
];

export type StatLayout = {
  hero: [MetricId, MetricId];
  secondary: [MetricId, MetricId, MetricId];
};

export const DEFAULT_LAYOUT: StatLayout = {
  hero: ["distance", "duration"],
  secondary: ["pace", "cadence", "elevation"],
};

const STORAGE_KEY = "orbit:stat-layout:v1";

export function loadLayout(): StatLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as StatLayout;
    if (
      parsed?.hero?.length === 2 &&
      parsed?.secondary?.length === 3 &&
      [...parsed.hero, ...parsed.secondary].every((m) => m in METRICS)
    ) {
      return parsed;
    }
  } catch {
    /* noop */
  }
  return DEFAULT_LAYOUT;
}

export function saveLayout(layout: StatLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* noop */
  }
}
