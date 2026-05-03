// User-entered vitals (resting HR, HRV) with a daily history for baselines.
// LocalStorage-backed; emits "orbit:vitals-update" so hooks can refresh.

export type VitalsSample = {
  t: number;
  restingHr?: number;
  hrvMs?: number;
};

export type Vitals = {
  restingHr?: number;
  hrvMs?: number;
  updatedAt: number;
  history: VitalsSample[];
};

const STORAGE_KEY = "orbit:vitals:v1";
export const VITALS_EVENT = "orbit:vitals-update";

export const DEFAULT_VITALS: Vitals = { updatedAt: 0, history: [] };

export function loadVitals(): Vitals {
  if (typeof window === "undefined") return DEFAULT_VITALS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VITALS;
    const parsed = JSON.parse(raw) as Vitals;
    return { ...DEFAULT_VITALS, ...parsed, history: parsed.history ?? [] };
  } catch {
    return DEFAULT_VITALS;
  }
}

export function saveVitals(next: Partial<Pick<Vitals, "restingHr" | "hrvMs">>): Vitals {
  const cur = loadVitals();
  const merged: Vitals = {
    restingHr: next.restingHr ?? cur.restingHr,
    hrvMs: next.hrvMs ?? cur.hrvMs,
    updatedAt: Date.now(),
    history: [...cur.history, { t: Date.now(), ...next }].slice(-180),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent(VITALS_EVENT));
    } catch {
      /* noop */
    }
  }
  return merged;
}

export type VitalsBaseline = {
  restingHr: number; // 0 when unknown
  hrvMs: number; // 0 when unknown
  restingHrSamples: number;
  hrvSamples: number;
};

export function vitalsBaseline(v: Vitals, days = 28, now = Date.now()): VitalsBaseline {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  const recent = v.history.filter((s) => s.t >= cutoff);
  const rhr = recent.map((s) => s.restingHr).filter((n): n is number => typeof n === "number");
  const hrv = recent.map((s) => s.hrvMs).filter((n): n is number => typeof n === "number");
  const avg = (a: number[]) => (a.length === 0 ? 0 : a.reduce((s, n) => s + n, 0) / a.length);
  return {
    restingHr: Math.round(avg(rhr)),
    hrvMs: Math.round(avg(hrv)),
    restingHrSamples: rhr.length,
    hrvSamples: hrv.length,
  };
}
