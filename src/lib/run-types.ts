export type GeoPoint = {
  lat: number;
  lng: number;
  alt: number | null;
  t: number; // ms timestamp
  speed: number | null; // m/s
};

export type Split = {
  km: number;
  durationMs: number; // time for this km
  paceSecPerKm: number;
  totalDistanceM: number;
  totalDurationMs: number;
};

export type RunWeather = {
  tempC: number;
  code: number;
  label: string;
  icon: string;
};

export type Run = {
  id: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  distanceM: number;
  elevationGainM: number;
  avgPaceSecPerKm: number;
  avgCadenceSpm: number;
  points: GeoPoint[];
  splits: Split[];
  shoe?: { brand: string; model: string } | null;
  weather?: RunWeather | null;
  /** Pre-rendered SVG data URL of the speed heatmap, generated on save. */
  heatmapSnapshot?: string | null;
};

export const RUNS_KEY = "lux-runner:runs:v1";

export function loadRuns(): Run[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Run[];
  } catch {
    return [];
  }
}

export function saveRun(run: Run) {
  const all = loadRuns();
  all.unshift(run);
  window.localStorage.setItem(RUNS_KEY, JSON.stringify(all.slice(0, 200)));
}

export function deleteRun(id: string) {
  const all = loadRuns().filter((r) => r.id !== id);
  window.localStorage.setItem(RUNS_KEY, JSON.stringify(all));
}
