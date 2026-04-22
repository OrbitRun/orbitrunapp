// Personalization: user profile (name, level, goal) stored in localStorage.

import type { Lang } from "@/lib/i18n";
import type { MetricId, StatLayout } from "@/lib/stat-metrics";
import { sanitizeName } from "@/lib/sanitize";

export type Level = "beginner" | "expert";
export type GoalId = "complete5k" | "faster" | "weightloss" | "marathon";

export type UserProfile = {
  name: string;
  level: Level;
  goal: GoalId;
  createdAt: number;
};

const STORAGE_KEY = "orbit:profile:v1";

export const GOAL_IDS: GoalId[] = ["complete5k", "faster", "weightloss", "marathon"];

export function loadProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as UserProfile;
    if (typeof p?.name === "string" && (p.level === "beginner" || p.level === "expert")) {
      // Defensive sanitization: strip any HTML/scripts that could have been
      // injected into localStorage via DevTools or a stale build.
      return { ...p, name: sanitizeName(p.name) };
    }
  } catch {
    /* noop */
  }
  return null;
}

export function saveProfile(p: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    const safe: UserProfile = { ...p, name: sanitizeName(p.name) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    window.dispatchEvent(new CustomEvent("orbit:profile-change"));
  } catch {
    /* noop */
  }
}

export function getDisplayName(p: UserProfile | null, lang: Lang): string {
  const fallback = lang === "da" ? "Løber" : "Runner";
  return p?.name?.trim() || fallback;
}

// Defaults driven by experience level.
export function defaultLayoutForLevel(level: Level): StatLayout {
  if (level === "expert") {
    return {
      hero: ["distance", "duration"],
      secondary: ["pace", "cadence", "elevation"],
    };
  }
  // Beginner: simpler — show avg pace (more stable) and skip cadence by default.
  return {
    hero: ["distance", "duration"],
    secondary: ["pace", "avgPace", "elevation"] as [MetricId, MetricId, MetricId],
  };
}

// Voice cue cadence in km. Beginners get every 1 km, experts every 0.5 km.
export function cueIntervalKm(level: Level): number {
  return level === "expert" ? 0.5 : 1;
}

// Lightweight goal progress.
export type GoalProgress = {
  label: string; // localized short label
  pct: number; // 0..1
  detail: string; // e.g. "3.2 / 5.0 km"
};

export function computeGoalProgress(
  profile: UserProfile,
  runs: { distanceM: number; startedAt: number }[],
  lang: Lang,
): GoalProgress | null {
  const da = lang === "da";
  if (profile.goal === "complete5k") {
    const longestM = runs.reduce((a, r) => Math.max(a, r.distanceM), 0);
    const pct = Math.min(1, longestM / 5000);
    return {
      label: da ? "Mod 5 km" : "Toward 5 km",
      pct,
      detail: `${(longestM / 1000).toFixed(2)} / 5.00 km`,
    };
  }
  if (profile.goal === "marathon") {
    const longestM = runs.reduce((a, r) => Math.max(a, r.distanceM), 0);
    const pct = Math.min(1, longestM / 42195);
    return {
      label: da ? "Mod marathon" : "Toward marathon",
      pct,
      detail: `${(longestM / 1000).toFixed(1)} / 42.2 km`,
    };
  }
  if (profile.goal === "weightloss") {
    // Total km this calendar week.
    const now = new Date();
    const day = (now.getDay() + 6) % 7; // Monday=0
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - day);
    const startTs = start.getTime();
    const totalM = runs.filter((r) => r.startedAt >= startTs).reduce((a, r) => a + r.distanceM, 0);
    const targetM = 20000; // 20 km/week soft target
    return {
      label: da ? "Denne uge" : "This week",
      pct: Math.min(1, totalM / targetM),
      detail: `${(totalM / 1000).toFixed(1)} / 20.0 km`,
    };
  }
  // "faster" — track best avg pace over last 5 runs vs first 5
  return null;
}
