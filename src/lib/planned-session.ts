// Persist a "planned session for today" so the Run tab can surface it.
import type { CoachSession } from "@/lib/user-profile";

const KEY = "orbit:planned-session:v1";
export const PLANNED_EVENT = "orbit:planned-session-update";

export type PlannedSession = {
  session: CoachSession;
  band: "rest" | "easy" | "ready" | "prime";
  score: number;
  savedAt: number;
};

export function loadPlannedSession(): PlannedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PlannedSession;
    // Expire after 24h
    if (Date.now() - p.savedAt > 24 * 60 * 60 * 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export function savePlannedSession(p: Omit<PlannedSession, "savedAt">): PlannedSession {
  const next: PlannedSession = { ...p, savedAt: Date.now() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(PLANNED_EVENT));
  } catch {
    /* noop */
  }
  return next;
}

export function clearPlannedSession() {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(PLANNED_EVENT));
  } catch {
    /* noop */
  }
}
