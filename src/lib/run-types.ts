export type GeoPoint = {
  lat: number;
  lng: number;
  alt: number | null;
  t: number; // ms timestamp
  speed: number | null; // m/s
  hrBpm?: number | null; // latest known heart rate at this fix (Apple Health)
};

export type HrSample = { t: number; bpm: number };

export type Split = {
  km: number;
  durationMs: number; // time for this km
  paceSecPerKm: number;
  totalDistanceM: number;
  totalDurationMs: number;
};

export type RunWeather = {
  tempC: number;
  windMs: number;
  code: number; // Open-Meteo WMO weather_code
  condition: string; // i18n key, e.g. "weather.sunny"
  icon: string; // lucide icon name, e.g. "Sun"
  capturedAt: number;
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
  weather?: RunWeather;
  shoeId?: string;
  rpe?: number; // 1..10 perceived exertion
  avgHrBpm?: number;
  maxHrBpm?: number;
  hrSeries?: HrSample[];
  // Heart-rate recovery: BPM drop in the first 60s after stop. Higher = better recovery.
  hrrDrop60s?: number;
  // % of run time spent in Zone 5 (>=90% of max HR). Used by the recovery engine.
  zone5PctTime?: number;
};

export const RUNS_KEY = "lux-runner:runs:v1";

export function loadRuns(): Run[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RUNS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Run & { weather?: RunWeather & { windKph?: number } }>;
    // Migrate legacy windKph (km/h) → windMs (m/s) on read.
    return parsed.map((r) => {
      if (r.weather && r.weather.windMs == null && typeof r.weather.windKph === "number") {
        const { windKph, ...rest } = r.weather;
        return { ...r, weather: { ...rest, windMs: Math.round((windKph / 3.6) * 10) / 10 } };
      }
      return r;
    });
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

export function updateRun(id: string, patch: Partial<Run>): Run | null {
  const all = loadRuns();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const next = { ...all[idx], ...patch, id: all[idx].id };
  all[idx] = next;
  window.localStorage.setItem(RUNS_KEY, JSON.stringify(all));
  return next;
}
