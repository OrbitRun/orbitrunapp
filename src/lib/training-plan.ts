// Adaptive multi-week training plan derived from CoachConfig + recent runs.
import type { CoachConfig, CoachAmbition, OnboardingData } from "./user-profile";
import type { Run } from "./run-types";
import { getCoachPlan, type MilestonePhase } from "./coach-plan";

export type SessionType = "easy" | "long" | "tempo" | "intervals" | "walkRun" | "rest";
export type SessionStatus = "upcoming" | "done" | "skipped" | "adjusted";

export type PlannedSession = {
  id: string;
  weekIndex: number;
  dayIndex: number; // 0=Mon..6=Sun
  date: number;
  type: SessionType;
  titleKey: string; // i18n key for type
  distanceKm: number;
  status: SessionStatus;
  matchedRunId?: string;
  adjustedReasonKey?: string;
};

export type PlannedWeek = {
  weekIndex: number;
  phase: MilestonePhase;
  weekStart: number;
  totalKm: number;
  sessions: PlannedSession[];
  isCurrent: boolean;
  isPast: boolean;
  isEstimated: boolean;
};

const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

function ambitionMult(a?: CoachAmbition): number {
  if (a === "elite") return 1.5;
  if (a === "pr") return 1.2;
  return 1.0;
}

function baseWeeklyKm(c: CoachConfig): number {
  const lvl = c.level === "0-2" ? 8 : c.level === "3-5" ? 16 : c.level === "5-10" ? 28 : 45;
  return Math.round(lvl * ambitionMult(c.ambition));
}

function dayPattern(weeklySessions: number): number[] {
  // Mon=0..Sun=6
  if (weeklySessions <= 2) return [0, 5];
  if (weeklySessions === 3) return [0, 2, 5];
  if (weeklySessions === 4) return [0, 2, 4, 6];
  return [0, 1, 3, 4, 6];
}

function phaseTypes(phase: MilestonePhase, n: number): SessionType[] {
  // returns array of types of length n; last element typically long
  const out: SessionType[] = [];
  for (let i = 0; i < n; i++) out.push("easy");
  out[n - 1] = "long";
  if (phase === "build" && n >= 2) out[1] = "tempo";
  if (phase === "peak" && n >= 3) {
    out[1] = "tempo";
    out[Math.min(2, n - 2)] = "intervals";
  }
  if (phase === "taper") {
    for (let i = 0; i < n - 1; i++) out[i] = "easy";
  }
  return out;
}

function distributeKm(types: SessionType[], totalKm: number): number[] {
  const weights = types.map((t) =>
    t === "long" ? 2.2 : t === "tempo" ? 1.1 : t === "intervals" ? 1.0 : t === "walkRun" ? 0.6 : 1.0,
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.max(1, Math.round((w / sum) * totalKm)));
}

function recomputeTotalWeeks(c: CoachConfig, baseTotal: number): number {
  if (!c.targetDate) return baseTotal;
  const target = new Date(c.targetDate).getTime();
  if (isNaN(target)) return baseTotal;
  const weeks = Math.round((startOfWeek(target) - startOfWeek(c.configuredAt)) / WEEK_MS) + 1;
  return Math.max(4, Math.min(24, weeks));
}

function phaseFor(weekIndex: number, totalWeeks: number): MilestonePhase {
  const base = Math.max(1, Math.round(totalWeeks * 0.3));
  const build = Math.max(1, Math.round(totalWeeks * 0.4));
  const taper = Math.max(1, Math.round(totalWeeks * 0.1));
  const peak = Math.max(1, totalWeeks - base - build - taper);
  if (weekIndex <= base) return "base";
  if (weekIndex <= base + build) return "build";
  if (weekIndex <= base + build + peak) return "peak";
  void taper;
  return "taper";
}

export type AdaptiveContext = {
  runs: Run[];
  hrvDropPct?: number; // negative if dropped
  load7dRatio?: number; // 7d trimp / prior 7d
};

function statusForPlanned(
  planned: PlannedSession,
  runs: Run[],
  now: number,
): { status: SessionStatus; matchedRunId?: string; reasonKey?: string } {
  if (planned.date > now) return { status: "upcoming" };
  // Match a run within ±2 days by closest endedAt.
  const window = 2 * DAY_MS;
  const candidates = runs.filter((r) => Math.abs(r.endedAt - planned.date) <= window);
  if (candidates.length === 0) {
    if (planned.date < now - DAY_MS) return { status: "skipped" };
    return { status: "upcoming" };
  }
  const match = candidates.sort(
    (a, b) => Math.abs(a.endedAt - planned.date) - Math.abs(b.endedAt - planned.date),
  )[0];
  const km = match.distanceM / 1000;
  if (km >= planned.distanceKm * 0.8) {
    return { status: "done", matchedRunId: match.id };
  }
  return { status: "adjusted", matchedRunId: match.id, reasonKey: "plan.reason.short" };
}

export function buildPlan(
  c: CoachConfig,
  ctx: AdaptiveContext,
  onboarding?: OnboardingData,
): {
  weeks: PlannedWeek[];
  totalWeeks: number;
  weekIndex: number;
  totalSessions: number;
  doneSessions: number;
  pct: number;
} {
  const baseplan = getCoachPlan(c);
  const totalWeeks = recomputeTotalWeeks(c, baseplan.totalWeeks);
  const weeklySessions = baseplan.weeklySessions;
  const baseKm = baseWeeklyKm(c);

  // Apply preferred days when set, otherwise fall back to canonical pattern.
  const preferred = onboarding?.preferredDays;
  const days =
    preferred && preferred.length >= weeklySessions
      ? [...preferred].sort((a, b) => a - b).slice(0, weeklySessions)
      : dayPattern(weeklySessions);

  const startWeek = startOfWeek(c.configuredAt);
  const now = Date.now();
  const currentWeekIndex = Math.min(
    totalWeeks,
    Math.max(1, Math.floor((startOfWeek(now) - startWeek) / WEEK_MS) + 1),
  );

  // Adaptive volume scaling for future weeks based on actual recent vs planned km.
  const last14d = ctx.runs.filter((r) => r.endedAt >= now - 14 * DAY_MS);
  const actualKm14 = last14d.reduce((s, r) => s + r.distanceM / 1000, 0);
  const expectedKm14 = baseKm * 2;
  let futureScale = 1;
  if (expectedKm14 > 0) {
    const ratio = actualKm14 / expectedKm14;
    if (ratio > 1.1) futureScale = 1.1;
    else if (ratio < 0.7) futureScale = 0.85;
  }

  // Onboarding-driven first 2-week ramp-up: ease in if injuries or low volume.
  const lowVolume = onboarding?.weeklyKm === "0" || onboarding?.weeklyKm === "0-10";
  const hasInjuries = onboarding?.hasInjuries === true;
  const newbie = onboarding?.experience === "newbie";
  const earlyEase = lowVolume || hasInjuries || newbie;
  const week1Scale = earlyEase ? (hasInjuries ? 0.5 : 0.6) : 1;
  const week2Scale = earlyEase ? (hasInjuries ? 0.7 : 0.8) : 1;
  const earlyReason = hasInjuries
    ? "plan.reason.injury"
    : lowVolume
      ? "plan.reason.lowVolume"
      : "plan.reason.newbie";

  // Current-week stress override
  const stress =
    (ctx.load7dRatio !== undefined && ctx.load7dRatio > 1.4) ||
    (ctx.hrvDropPct !== undefined && ctx.hrvDropPct < -15);
  const stressReason =
    ctx.hrvDropPct !== undefined && ctx.hrvDropPct < -15
      ? "plan.reason.lowHrv"
      : "plan.reason.highLoad";

  const weeks: PlannedWeek[] = [];
  let totalSessions = 0;
  let doneSessions = 0;

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = phaseFor(w, totalWeeks);
    const isPast = w < currentWeekIndex;
    const isCurrent = w === currentWeekIndex;
    const isEstimated = w > currentWeekIndex;

    let weekKm = baseKm;
    if (phase === "build") weekKm = Math.round(baseKm * 1.1);
    if (phase === "peak") weekKm = Math.round(baseKm * 1.25);
    if (phase === "taper") weekKm = Math.round(baseKm * 0.6);
    if (isEstimated) weekKm = Math.round(weekKm * futureScale);

    const types = phaseTypes(phase, weeklySessions);
    const kms = distributeKm(types, weekKm);
    const weekStart = startWeek + (w - 1) * WEEK_MS;

    const sessions: PlannedSession[] = types.map((type, i) => {
      const dayIndex = days[i];
      const date = weekStart + dayIndex * DAY_MS;
      let s: PlannedSession = {
        id: `${w}-${dayIndex}`,
        weekIndex: w,
        dayIndex,
        date,
        type,
        titleKey: `plan.session.${type}`,
        distanceKm: kms[i],
        status: "upcoming",
      };
      if (!isEstimated) {
        const r = statusForPlanned(s, ctx.runs, now);
        s = { ...s, status: r.status, matchedRunId: r.matchedRunId, adjustedReasonKey: r.reasonKey };
      }
      // Current-week future days: apply stress override
      if (isCurrent && date > now && stress && (type === "tempo" || type === "intervals" || type === "long")) {
        s = {
          ...s,
          type: "easy",
          titleKey: "plan.session.easy",
          distanceKm: Math.max(3, Math.round(s.distanceKm * 0.6)),
          status: "adjusted",
          adjustedReasonKey: stressReason,
        };
      }
      return s;
    });

    totalSessions += sessions.length;
    doneSessions += sessions.filter((s) => s.status === "done").length;

    weeks.push({
      weekIndex: w,
      phase,
      weekStart,
      totalKm: sessions.reduce((s, x) => s + x.distanceKm, 0),
      sessions,
      isCurrent,
      isPast,
      isEstimated,
    });
  }

  const pct = Math.min(100, Math.round((doneSessions / Math.max(1, totalSessions)) * 100));
  return { weeks, totalWeeks, weekIndex: currentWeekIndex, totalSessions, doneSessions, pct };
}
