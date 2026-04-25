// Metric registry for the customizable stat grid.
// Each metric knows how to render its current value from the live tracker state.

import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import type { Run } from "@/lib/run-types";
import type { ExperienceLevel } from "@/lib/user-profile";

export type MetricId =
  | "distance"
  | "duration"
  | "pace"
  | "avgPace"
  | "cadence"
  | "elevation"
  | "calories"
  | "stride"
  | "vertOsc"
  | "groundContact"
  | "sweatLoss";

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

// Default body weight (kg) used for calorie / sweat estimates when the user
// profile doesn't capture weight. Keeps formulas simple and stable.
const DEFAULT_WEIGHT_KG = 70;

// Speed (m/s) derived from current pace, falling back to average pace.
function speedMs(s: LiveStats): number {
  const pace = s.currentPaceSecPerKm || s.avgPaceSecPerKm;
  if (!pace || pace <= 0) return 0;
  return 1000 / pace;
}

// kcal estimate: MET-based. Running MET ≈ 1.035 × speed(km/h).
// kcal = MET × weight(kg) × hours.
function estimateCalories(s: LiveStats): number {
  const hours = s.elapsedMs / 3_600_000;
  if (hours <= 0) return 0;
  const avgSpeedKmh = s.avgPaceSecPerKm > 0 ? 3600 / s.avgPaceSecPerKm : 0;
  if (avgSpeedKmh <= 0) {
    const km = s.distanceM / 1000;
    if (km <= 0) return 0;
    const met = 1.035 * (km / hours);
    return Math.round(met * DEFAULT_WEIGHT_KG * hours);
  }
  const met = 1.035 * avgSpeedKmh;
  return Math.round(met * DEFAULT_WEIGHT_KG * hours);
}

// Stride length (m) = (speed × 120) / cadence — two steps per stride.
function estimateStrideM(s: LiveStats): number {
  const v = speedMs(s);
  if (v <= 0 || s.cadenceSpm <= 0) return 0;
  return (v * 120) / s.cadenceSpm;
}

// Vertical oscillation (cm) — rough model, capped at 14 cm.
function estimateVerticalOscCm(s: LiveStats): number {
  const v = speedMs(s);
  if (v <= 0) return 0;
  return Math.min(14, 6 + 1.4 * v);
}

// Ground contact time (ms): step time × 35% contact phase.
function estimateGroundContactMs(s: LiveStats): number {
  if (s.cadenceSpm <= 0) return 0;
  const stepMs = 60000 / s.cadenceSpm;
  return Math.round(stepMs * 0.35);
}

// Sweat loss (L) — baseline 1.2 L/h scaled by intensity.
function estimateSweatLossL(s: LiveStats): number {
  const hours = s.elapsedMs / 3_600_000;
  if (hours <= 0) return 0;
  const avgSpeedKmh = s.avgPaceSecPerKm > 0 ? 3600 / s.avgPaceSecPerKm : 0;
  const intensity = Math.max(0.6, Math.min(1.6, avgSpeedKmh / 10));
  return 1.2 * hours * intensity;
}

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
  calories: {
    id: "calories",
    labelKey: "stat.calories",
    unitKey: "unit.kcal",
    format: (s) => estimateCalories(s).toString(),
  },
  stride: {
    id: "stride",
    labelKey: "stat.stride",
    unitKey: "unit.m",
    format: (s) => {
      const v = estimateStrideM(s);
      return v > 0 ? v.toFixed(2) : "—";
    },
  },
  vertOsc: {
    id: "vertOsc",
    labelKey: "stat.vertOsc",
    unitKey: "unit.cm",
    format: (s) => {
      const v = estimateVerticalOscCm(s);
      return v > 0 ? v.toFixed(1) : "—";
    },
  },
  groundContact: {
    id: "groundContact",
    labelKey: "stat.groundContact",
    unitKey: "unit.ms",
    format: (s) => {
      const v = estimateGroundContactMs(s);
      return v > 0 ? v.toString() : "—";
    },
  },
  sweatLoss: {
    id: "sweatLoss",
    labelKey: "stat.sweatLoss",
    unitKey: "unit.l",
    format: (s) => {
      const v = estimateSweatLossL(s);
      return v > 0 ? v.toFixed(2) : "—";
    },
  },
};

export const ALL_METRIC_IDS: MetricId[] = [
  "distance",
  "duration",
  "pace",
  "avgPace",
  "cadence",
  "elevation",
  "calories",
  "stride",
  "vertOsc",
  "groundContact",
  "sweatLoss",
];

export type StatLayout = {
  hero: [MetricId, MetricId];
  secondary: [MetricId, MetricId, MetricId];
};

export const LEVEL_LAYOUTS: Record<ExperienceLevel, StatLayout> = {
  beginner: {
    hero: ["distance", "duration"],
    secondary: ["pace", "avgPace", "calories"],
  },
  expert: {
    hero: ["distance", "pace"],
    secondary: ["duration", "cadence", "elevation"],
  },
};

// Backwards-compat: beginner preset.
export const DEFAULT_LAYOUT: StatLayout = LEVEL_LAYOUTS.beginner;

const STORAGE_PREFIX = "orbit:stat-layout:v2";
const storageKey = (level: ExperienceLevel) => `${STORAGE_PREFIX}:${level}`;

export function loadLayout(level: ExperienceLevel = "beginner"): StatLayout {
  const fallback = LEVEL_LAYOUTS[level];
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(level));
    if (!raw) return fallback;
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
  return fallback;
}

export function saveLayout(layout: StatLayout, level: ExperienceLevel = "beginner") {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(level), JSON.stringify(layout));
  } catch {
    /* noop */
  }
}

// Build a `LiveStats` snapshot from a saved Run so post-run views can reuse the
// same metric formatters as the live tracker.
export function computeRunMetrics(run: Run): LiveStats {
  return {
    distanceM: run.distanceM,
    elapsedMs: run.durationMs,
    currentPaceSecPerKm: run.avgPaceSecPerKm,
    avgPaceSecPerKm: run.avgPaceSecPerKm,
    cadenceSpm: run.avgCadenceSpm,
    elevationGainM: run.elevationGainM,
  };
}

// Choose a single hero font-size class that fits the longest of the given values.
// Used so paired hero tiles render at the same size for visual balance.
export function heroFontSizeFor(values: string[]): string {
  const len = values.reduce((m, v) => Math.max(m, v.length), 0);
  if (len >= 8) return "text-[26px]";
  if (len >= 7) return "text-[30px]";
  if (len >= 5) return "text-[34px]";
  return "text-[40px]";
}
