// Coach plan derivation: from a CoachConfig produce a multi-week training plan
// with milestone phases, plus progress computed from completed runs since the
// coach was configured.

import type { CoachConfig, CoachGoal, FasterDistance } from "./user-profile";
import type { Run } from "./run-types";

export type MilestonePhase = "base" | "build" | "peak" | "taper";

export type Milestone = {
  weekStart: number; // 1-indexed inclusive
  weekEnd: number; // inclusive
  phase: MilestonePhase;
};

export type CoachPlan = {
  totalWeeks: number;
  weeklySessions: number;
  milestones: Milestone[];
};

function weeklySessionsFor(freq: CoachConfig["frequency"]): number {
  switch (freq) {
    case "1-2":
      return 2;
    case "3-4":
      return 3;
    case "5+":
      return 5;
  }
}

function totalWeeksFor(goal: CoachGoal, faster?: FasterDistance): number {
  // Distance-based goals get standard plan lengths.
  switch (goal) {
    case "finish5k":
      return 8;
    case "finish10k":
      return 10;
    case "halfMarathon":
      return 12;
    case "marathon":
      return 16;
    case "weightLoss":
      return 12;
    case "runFaster":
      switch (faster) {
        case "5k":
          return 6;
        case "10k":
          return 8;
        case "halfMarathon":
          return 10;
        case "marathon":
          return 12;
        default:
          return 8;
      }
  }
}

function buildMilestones(totalWeeks: number): Milestone[] {
  // Split: 30% base, 40% build, 20% peak, 10% taper. Always at least 1 week each.
  const base = Math.max(1, Math.round(totalWeeks * 0.3));
  const build = Math.max(1, Math.round(totalWeeks * 0.4));
  const taper = Math.max(1, Math.round(totalWeeks * 0.1));
  const peak = Math.max(1, totalWeeks - base - build - taper);
  let cursor = 1;
  const out: Milestone[] = [];
  const push = (len: number, phase: MilestonePhase) => {
    if (len <= 0) return;
    out.push({ weekStart: cursor, weekEnd: cursor + len - 1, phase });
    cursor += len;
  };
  push(base, "base");
  push(build, "build");
  push(peak, "peak");
  push(taper, "taper");
  return out;
}

export function getCoachPlan(c: CoachConfig): CoachPlan {
  const totalWeeks = totalWeeksFor(c.goal, c.fasterDistance);
  const weeklySessions = weeklySessionsFor(c.frequency);
  return { totalWeeks, weeklySessions, milestones: buildMilestones(totalWeeks) };
}

export function phaseLabel(phase: MilestonePhase, lang: "en" | "da"): string {
  const en: Record<MilestonePhase, string> = {
    base: "Base",
    build: "Build",
    peak: "Peak",
    taper: "Taper",
  };
  const da: Record<MilestonePhase, string> = {
    base: "Opbygning",
    build: "Tempo",
    peak: "Peak",
    taper: "Nedtrapning",
  };
  return (lang === "da" ? da : en)[phase];
}

export type PlanProgress = {
  weekIndex: number; // 1-indexed current week
  totalWeeks: number;
  weekLabel: string; // e.g. "Uge 2: Opbygning"
  phase: MilestonePhase;
  sessionsDone: number;
  sessionsPlanned: number; // through current week (inclusive)
  totalSessions: number; // whole plan
  pct: number; // 0..100, completed vs sessionsPlanned-through-current-week
  overallPct: number; // 0..100, completed vs totalSessions
  complete: boolean;
};

export function getPlanProgress(
  c: CoachConfig,
  runs: Run[],
  lang: "en" | "da"
): PlanProgress {
  const plan = getCoachPlan(c);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const elapsedWeeks = Math.floor((Date.now() - c.configuredAt) / weekMs);
  const weekIndex = Math.min(plan.totalWeeks, Math.max(1, elapsedWeeks + 1));
  const phase =
    plan.milestones.find((m) => weekIndex >= m.weekStart && weekIndex <= m.weekEnd)
      ?.phase ?? "base";
  const sessionsDone = runs.filter((r) => r.endedAt >= c.configuredAt).length;
  const sessionsPlanned = weekIndex * plan.weeklySessions;
  const totalSessions = plan.totalWeeks * plan.weeklySessions;
  const pct = Math.min(100, Math.round((sessionsDone / Math.max(1, sessionsPlanned)) * 100));
  const overallPct = Math.min(
    100,
    Math.round((sessionsDone / Math.max(1, totalSessions)) * 100)
  );
  const weekWord = lang === "da" ? "Uge" : "Week";
  const weekLabel = `${weekWord} ${weekIndex}: ${phaseLabel(phase, lang)}`;
  return {
    weekIndex,
    totalWeeks: plan.totalWeeks,
    weekLabel,
    phase,
    sessionsDone,
    sessionsPlanned,
    totalSessions,
    pct,
    overallPct,
    complete: sessionsDone >= totalSessions,
  };
}
