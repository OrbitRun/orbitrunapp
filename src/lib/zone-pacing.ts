// Zone-based pacing: per-HR-zone target pace recommendations.
// Persisted to localStorage with cache + custom-event so reactive hooks update.

import type { HrZoneId } from "@/lib/hr-zones-config";

export type PaceStatus = "on-target" | "too-fast" | "too-slow";

export type ZonePacingConfig = {
  enabled: boolean;
  baseSecPerKm: number;                          // Z3 reference pace
  offsets: Record<HrZoneId, number>;             // sec/km vs base
  updatedAt: number;
};

export type ZoneTarget = {
  lower: number;                                 // sec/km
  upper: number;
  mid: number;
};

const STORAGE_KEY = "orbit:zone-pacing:v1";
export const ZONE_PACING_EVENT = "orbit:zone-pacing-update";

// Default offsets (sec/km vs base/easy pace).
// Z3 = base, slower zones positive, faster zones negative.
export const DEFAULT_OFFSETS: Record<HrZoneId, number> = {
  1: 90,
  2: 30,
  3: 0,
  4: -25,
  5: -55,
};

export const DEFAULT_BASE_SEC_PER_KM = 360; // 6:00/km

// Half-window each side of the target midpoint (sec/km).
export const TARGET_HALF_WINDOW = 15;
// Dead-band where we still consider "on target".
export const DEAD_BAND = 10;

export function defaultPacingConfig(baseSecPerKm = DEFAULT_BASE_SEC_PER_KM): ZonePacingConfig {
  return {
    enabled: false,
    baseSecPerKm: clampBase(baseSecPerKm),
    offsets: { ...DEFAULT_OFFSETS },
    updatedAt: Date.now(),
  };
}

export function clampBase(sec: number): number {
  if (!Number.isFinite(sec)) return DEFAULT_BASE_SEC_PER_KM;
  return Math.max(180, Math.min(900, Math.round(sec)));
}

export function clampOffset(sec: number): number {
  if (!Number.isFinite(sec)) return 0;
  return Math.max(-120, Math.min(180, Math.round(sec)));
}

export function targetForZone(zone: HrZoneId, cfg: ZonePacingConfig): ZoneTarget {
  const mid = Math.max(120, cfg.baseSecPerKm + (cfg.offsets[zone] ?? 0));
  return {
    mid,
    lower: mid - TARGET_HALF_WINDOW,
    upper: mid + TARGET_HALF_WINDOW,
  };
}

// Note: lower sec/km = faster pace.
// currentSec below window → too fast. Above → too slow.
export function paceStatus(currentSec: number, target: ZoneTarget): PaceStatus {
  if (!Number.isFinite(currentSec) || currentSec <= 0) return "on-target";
  if (Math.abs(currentSec - target.mid) <= DEAD_BAND) return "on-target";
  if (currentSec < target.lower) return "too-fast";
  if (currentSec > target.upper) return "too-slow";
  return "on-target";
}

let _cache: ZonePacingConfig | null | undefined = undefined;

export function loadZonePacing(): ZonePacingConfig {
  if (_cache !== undefined && _cache !== null) return _cache;
  if (typeof window === "undefined") return defaultPacingConfig();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      _cache = defaultPacingConfig();
      return _cache;
    }
    const parsed = JSON.parse(raw) as Partial<ZonePacingConfig>;
    const cfg: ZonePacingConfig = {
      enabled: !!parsed.enabled,
      baseSecPerKm: clampBase(parsed.baseSecPerKm ?? DEFAULT_BASE_SEC_PER_KM),
      offsets: {
        1: clampOffset(parsed.offsets?.[1] ?? DEFAULT_OFFSETS[1]),
        2: clampOffset(parsed.offsets?.[2] ?? DEFAULT_OFFSETS[2]),
        3: clampOffset(parsed.offsets?.[3] ?? DEFAULT_OFFSETS[3]),
        4: clampOffset(parsed.offsets?.[4] ?? DEFAULT_OFFSETS[4]),
        5: clampOffset(parsed.offsets?.[5] ?? DEFAULT_OFFSETS[5]),
      },
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
    _cache = cfg;
    return cfg;
  } catch {
    _cache = defaultPacingConfig();
    return _cache;
  }
}

export function saveZonePacing(cfg: ZonePacingConfig) {
  if (typeof window === "undefined") return;
  const safe: ZonePacingConfig = {
    enabled: !!cfg.enabled,
    baseSecPerKm: clampBase(cfg.baseSecPerKm),
    offsets: {
      1: clampOffset(cfg.offsets[1]),
      2: clampOffset(cfg.offsets[2]),
      3: clampOffset(cfg.offsets[3]),
      4: clampOffset(cfg.offsets[4]),
      5: clampOffset(cfg.offsets[5]),
    },
    updatedAt: Date.now(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    _cache = safe;
    window.dispatchEvent(new CustomEvent(ZONE_PACING_EVENT));
  } catch {
    /* noop */
  }
}

// Median pace (sec/km) of last `n` runs, or null when not enough data.
export function recentMedianPace(
  paces: number[],
  n: number = 10,
): number | null {
  const valid = paces.filter((p) => Number.isFinite(p) && p > 0).slice(0, n);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}
