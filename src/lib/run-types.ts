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

export function updateRun(id: string, patch: Partial<Run>): Run | null {
  const all = loadRuns();
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const next = { ...all[idx], ...patch, id: all[idx].id };
  all[idx] = next;
  window.localStorage.setItem(RUNS_KEY, JSON.stringify(all));
  return next;
}
