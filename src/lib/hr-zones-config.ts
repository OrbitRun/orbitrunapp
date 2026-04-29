// User-configurable heart-rate zones.
// - Karvonen formula: target = ((maxHR − restHR) × pct) + restHR
// - Boundaries [.50, .60, .70, .80, .90, 1.00] → 5 contiguous zones
// - Persisted to localStorage with a module-level cache + change event so
//   pure helpers (zoneFor, zoneBoundaries, timeInZones) can read it sync.

import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";

export type HrZoneId = 1 | 2 | 3 | 4 | 5;
export type ZoneRange = { z: HrZoneId; lower: number; upper: number };
export type HrZoneSource = "karvonen" | "manual";

export type HrZoneConfig = {
  age: number; // 5..120
  restingHr: number; // 30..120
  maxHr: number; // restingHr+20..230
  source: HrZoneSource;
  zones: ZoneRange[]; // length 5, contiguous, ascending
  updatedAt: number;
};

const STORAGE_KEY = "orbit:hr-zones:v1";
export const HR_ZONES_EVENT = "orbit:hr-zones-update";

// Karvonen percentage edges (lower bounds for Z1..Z5 + final upper).
export const KARVONEN_EDGES = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0] as const;

export function maxHrFromAge(age: number): number {
  return Math.max(120, Math.min(230, Math.round(220 - age)));
}

export function karvonenZones(restingHr: number, maxHr: number): ZoneRange[] {
  const reserve = Math.max(1, maxHr - restingHr);
  const bpmAt = (pct: number) => Math.round(reserve * pct + restingHr);
  const edges = KARVONEN_EDGES.map(bpmAt);
  const zones: ZoneRange[] = [];
  for (let i = 0; i < 5; i++) {
    const lower = edges[i];
    // Upper is one less than next zone's lower so ranges don't overlap visually.
    const upper = i === 4 ? edges[5] : edges[i + 1] - 1;
    zones.push({ z: (i + 1) as HrZoneId, lower, upper });
  }
  return zones;
}

export function defaultConfig(age: number = 35, restingHr: number = 60): HrZoneConfig {
  const maxHr = maxHrFromAge(age);
  return {
    age,
    restingHr,
    maxHr,
    source: "karvonen",
    zones: karvonenZones(restingHr, maxHr),
    updatedAt: Date.now(),
  };
}

export type ValidationResult = { ok: true } | { ok: false; reason: string };

export function validateConfig(c: HrZoneConfig): ValidationResult {
  if (!Number.isFinite(c.age) || c.age < 5 || c.age > 120) return { ok: false, reason: "age" };
  if (!Number.isFinite(c.restingHr) || c.restingHr < 30 || c.restingHr > 120)
    return { ok: false, reason: "resting" };
  if (!Number.isFinite(c.maxHr) || c.maxHr <= c.restingHr || c.maxHr > 230)
    return { ok: false, reason: "max" };
  if (!Array.isArray(c.zones) || c.zones.length !== 5) return { ok: false, reason: "zones" };
  for (let i = 0; i < 5; i++) {
    const z = c.zones[i];
    if (!z || z.z !== i + 1) return { ok: false, reason: "zones" };
    if (!Number.isFinite(z.lower) || !Number.isFinite(z.upper)) return { ok: false, reason: "zones" };
    if (z.lower >= z.upper) return { ok: false, reason: `z${i + 1}` };
    if (i > 0 && c.zones[i].lower < c.zones[i - 1].upper) return { ok: false, reason: `z${i + 1}` };
  }
  return { ok: true };
}

let _cache: HrZoneConfig | null | undefined = undefined; // undefined = not read yet

export function loadHrZones(): HrZoneConfig | null {
  if (_cache !== undefined) return _cache;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      _cache = null;
      return null;
    }
    const parsed = JSON.parse(raw) as HrZoneConfig;
    const v = validateConfig(parsed);
    _cache = v.ok ? parsed : null;
    return _cache;
  } catch {
    _cache = null;
    return null;
  }
}

export function saveHrZones(c: HrZoneConfig): ValidationResult {
  const v = validateConfig(c);
  if (!v.ok) return v;
  if (typeof window === "undefined") return { ok: true };
  try {
    const next: HrZoneConfig = { ...c, updatedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    _cache = next;
    window.dispatchEvent(new CustomEvent(HR_ZONES_EVENT));
  } catch {
    /* noop */
  }
  return { ok: true };
}

export function clearHrZones(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    _cache = null;
    window.dispatchEvent(new CustomEvent(HR_ZONES_EVENT));
  } catch {
    /* noop */
  }
}

// Subscribe to in-process invalidations (e.g. when another module saves).
if (typeof window !== "undefined") {
  window.addEventListener(HR_ZONES_EVENT, () => {
    _cache = undefined;
  });
}

/** Returns the active zone for a BPM reading using saved config or fallback %s. */
export function zoneForBpm(bpm: number, config?: HrZoneConfig | null): HrZoneId {
  const c = config !== undefined ? config : loadHrZones();
  if (c) {
    for (let i = 4; i >= 0; i--) {
      if (bpm >= c.zones[i].lower) return c.zones[i].z;
    }
    return 1;
  }
  // Fallback — same thresholds as legacy zoneFor(bpm, DEFAULT_MAX_HR).
  const pct = bpm / DEFAULT_MAX_HR;
  if (pct >= 0.9) return 5;
  if (pct >= 0.8) return 4;
  if (pct >= 0.7) return 3;
  if (pct >= 0.6) return 2;
  return 1;
}

/** Lower-bound BPM per zone — used by chart guide lines. */
export function zoneLowerBounds(config?: HrZoneConfig | null): Array<{ z: HrZoneId; bpm: number }> {
  const c = config !== undefined ? config : loadHrZones();
  if (c) return c.zones.map((z) => ({ z: z.z, bpm: z.lower }));
  return [
    { z: 1, bpm: Math.round(DEFAULT_MAX_HR * 0.5) },
    { z: 2, bpm: Math.round(DEFAULT_MAX_HR * 0.6) },
    { z: 3, bpm: Math.round(DEFAULT_MAX_HR * 0.7) },
    { z: 4, bpm: Math.round(DEFAULT_MAX_HR * 0.8) },
    { z: 5, bpm: Math.round(DEFAULT_MAX_HR * 0.9) },
  ];
}

/** Effective max HR for derived calcs (VO2 etc.). */
export function effectiveMaxHr(config?: HrZoneConfig | null): number {
  const c = config !== undefined ? config : loadHrZones();
  return c ? c.maxHr : DEFAULT_MAX_HR;
}

/** OKLCH color tokens — also exported as CSS vars in styles.css. */
export const ZONE_COLOR_OKLCH: Record<HrZoneId, string> = {
  1: "oklch(0.72 0.02 250)", // grey
  2: "oklch(0.72 0.14 235)", // blue
  3: "oklch(0.86 0.20 145)", // green
  4: "oklch(0.78 0.18 60)", // orange
  5: "oklch(0.65 0.24 25)", // red
};

export const ZONE_VAR: Record<HrZoneId, string> = {
  1: "var(--hr-z1)",
  2: "var(--hr-z2)",
  3: "var(--hr-z3)",
  4: "var(--hr-z4)",
  5: "var(--hr-z5)",
};
