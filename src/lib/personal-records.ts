import { loadRuns, type Run } from "./run-types";

export type PrCategory =
  | "1k"
  | "5k"
  | "10k"
  | "half"
  | "marathon"
  | "longest"
  | "fastestKm";

export type PrEntry = {
  category: PrCategory;
  // For time-based PRs (1k…marathon, fastestKm) value is duration in ms.
  // For "longest" value is distance in meters.
  value: number;
  runId: string;
  achievedAt: number; // timestamp ms
};

export type PrMap = Partial<Record<PrCategory, PrEntry>>;

const PRS_KEY = "lux-runner:prs:v1";
const BUILT_FLAG = "lux-runner:prs:built:v1";

export const FIXED_DISTANCES: { category: PrCategory; meters: number }[] = [
  { category: "1k", meters: 1000 },
  { category: "5k", meters: 5000 },
  { category: "10k", meters: 10000 },
  { category: "half", meters: 21097.5 },
  { category: "marathon", meters: 42195 },
];

export const PR_ORDER: PrCategory[] = [
  "1k",
  "5k",
  "10k",
  "half",
  "marathon",
  "longest",
  "fastestKm",
];

// Time-based PRs are min, distance is max.
function isBetter(category: PrCategory, candidate: number, current: number): boolean {
  if (category === "longest") return candidate > current;
  return candidate < current;
}

export function loadPrs(): PrMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PRS_KEY);
    return raw ? (JSON.parse(raw) as PrMap) : {};
  } catch {
    return {};
  }
}

function savePrs(map: PrMap) {
  window.localStorage.setItem(PRS_KEY, JSON.stringify(map));
}

// Compute haversine inline to avoid a circular import with run-utils.
function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Sliding window: best (smallest) duration in ms to cover at least `target` meters.
function bestTimeForDistance(run: Run, target: number): number | null {
  const pts = run.points;
  if (pts.length < 2) return null;
  // Cumulative distance per point, starting at 0.
  const cum: number[] = new Array(pts.length);
  cum[0] = 0;
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + haversineM(pts[i - 1], pts[i]);
  }
  if (cum[cum.length - 1] < target) return null;

  let best = Infinity;
  let j = 0;
  for (let i = 0; i < pts.length; i++) {
    while (j < pts.length && cum[j] - cum[i] < target) j++;
    if (j >= pts.length) break;
    // Interpolate inside segment j-1 → j to find the exact moment we hit `target`.
    const segDist = cum[j] - cum[j - 1];
    const need = target - (cum[j - 1] - cum[i]);
    const frac = segDist > 0 ? need / segDist : 0;
    const tEnd = pts[j - 1].t + (pts[j].t - pts[j - 1].t) * frac;
    const dur = tEnd - pts[i].t;
    if (dur > 0 && dur < best) best = dur;
  }
  return isFinite(best) ? best : null;
}

export type PrCandidate = { category: PrCategory; value: number };

export function computeRunPrs(run: Run): PrCandidate[] {
  const out: PrCandidate[] = [];
  for (const { category, meters } of FIXED_DISTANCES) {
    if (run.distanceM >= meters) {
      const t = bestTimeForDistance(run, meters);
      if (t != null) out.push({ category, value: t });
    }
  }
  out.push({ category: "longest", value: run.distanceM });
  if (run.splits.length > 0) {
    const best = run.splits.reduce(
      (m, s) => (s.paceSecPerKm > 0 && s.paceSecPerKm < m ? s.paceSecPerKm : m),
      Infinity,
    );
    if (isFinite(best)) {
      // Store as ms for consistency with formatDuration display.
      out.push({ category: "fastestKm", value: best * 1000 });
    }
  }
  return out;
}

export function checkAndUpdatePrs(run: Run): PrCategory[] {
  if (typeof window === "undefined") return [];
  ensureBuilt();
  const map = loadPrs();
  const improved: PrCategory[] = [];
  for (const c of computeRunPrs(run)) {
    const existing = map[c.category];
    if (!existing || isBetter(c.category, c.value, existing.value)) {
      map[c.category] = {
        category: c.category,
        value: c.value,
        runId: run.id,
        achievedAt: run.endedAt,
      };
      improved.push(c.category);
    }
  }
  savePrs(map);
  return improved;
}

export function recomputeAllPrs(): PrMap {
  const runs = loadRuns();
  const map: PrMap = {};
  // Process oldest → newest so achievedAt reflects the first run that set the record.
  const ordered = [...runs].sort((a, b) => a.endedAt - b.endedAt);
  for (const run of ordered) {
    for (const c of computeRunPrs(run)) {
      const existing = map[c.category];
      if (!existing || isBetter(c.category, c.value, existing.value)) {
        map[c.category] = {
          category: c.category,
          value: c.value,
          runId: run.id,
          achievedAt: run.endedAt,
        };
      }
    }
  }
  savePrs(map);
  return map;
}

function ensureBuilt() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(BUILT_FLAG) === "1") return;
  recomputeAllPrs();
  window.localStorage.setItem(BUILT_FLAG, "1");
}
