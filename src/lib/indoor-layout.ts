// Persisted layout for the indoor Focus Run view.
// Super-hero metric (single huge, neon) + a list of 2x2 grid pages the user
// can swipe through. Each tile is long-press customizable.

import { METRICS, type MetricId } from "@/lib/stat-metrics";

export type IndoorLayout = {
  superHero: MetricId;
  gridPages: MetricId[][]; // each page = 4 metrics (2x2)
};

export const SUPER_HERO_OPTIONS: MetricId[] = ["pace", "hrBpm", "speed"];

export const DEFAULT_INDOOR_LAYOUT: IndoorLayout = {
  superHero: "pace",
  gridPages: [
    ["hrBpm", "distance", "duration", "cadence"],
    ["speed", "elevation", "calories", "avgPace"],
  ],
};

const STORAGE_KEY = "orbit:indoor-layout:v1";

function isValidMetric(id: unknown): id is MetricId {
  return typeof id === "string" && id in METRICS;
}

export function loadIndoorLayout(): IndoorLayout {
  if (typeof window === "undefined") return DEFAULT_INDOOR_LAYOUT;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_INDOOR_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<IndoorLayout>;
    const superHero = isValidMetric(parsed.superHero)
      ? parsed.superHero
      : DEFAULT_INDOOR_LAYOUT.superHero;
    const gridPages = Array.isArray(parsed.gridPages)
      ? parsed.gridPages
          .map((page) =>
            Array.isArray(page) && page.length === 4 && page.every(isValidMetric)
              ? (page as MetricId[])
              : null,
          )
          .filter((p): p is MetricId[] => p !== null)
      : [];
    return {
      superHero,
      gridPages: gridPages.length > 0 ? gridPages : DEFAULT_INDOOR_LAYOUT.gridPages,
    };
  } catch {
    return DEFAULT_INDOOR_LAYOUT;
  }
}

export function saveIndoorLayout(layout: IndoorLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    window.dispatchEvent(new CustomEvent("orbit:indoor-layout-update"));
  } catch {
    /* noop */
  }
}
