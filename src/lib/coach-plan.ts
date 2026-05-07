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

export type WeekAdjustment = {
  weekIndex: number;
  sessionMultiplier: number;
  intensityCap: "easy" | "moderate" | "any";
  noteKey: string;
};

export type CoachPlan = {
  totalWeeks: number;
  weeklySessions: number;
  milestones: Milestone[];
  earlyAdjustments: WeekAdjustment[];
};

function strictestCap(
  a: "easy" | "moderate" | "any",
  b: "easy" | "moderate" | "any"
): "easy" | "moderate" | "any" {
  const rank = { easy: 0, moderate: 1, any: 2 } as const;
  return rank[a] <= rank[b] ? a : b;
}

function buildEarlyAdjustments(c: CoachConfig): WeekAdjustment[] {
  // Elite runners start at full volume immediately — no deload.
  if (c.experience === "elite") return [];
  // For each of the first 2 weeks, accumulate the strictest rule.
  const weeks: { mult: number; cap: "easy" | "moderate" | "any"; noteKey: string }[] = [
    { mult: 1, cap: "any", noteKey: "" },
    { mult: 1, cap: "any", noteKey: "" },
  ];
  const apply = (idx: 0 | 1, mult: number, cap: "easy" | "moderate" | "any", noteKey: string) => {
    const w = weeks[idx];
    if (mult < w.mult) {
      w.mult = mult;
      w.noteKey = noteKey;
    }
    w.cap = strictestCap(w.cap, cap);
    if (!w.noteKey) w.noteKey = noteKey;
  };

  if (c.injuryStatus === "current") {
    apply(0, 0.4, "easy", "coach.adjust.note.injuryCurrent");
    apply(1, 0.4, "easy", "coach.adjust.note.injuryCurrent");
  } else if (c.injuryStatus === "past") {
    apply(0, 0.6, "easy", "coach.adjust.note.injuryPast");
    apply(1, 0.8, "moderate", "coach.adjust.note.injuryPast");
  }

  if (c.weeklyVolume === "0" || c.experience === "beginner") {
    apply(0, 0.5, "easy", "coach.adjust.note.lowVolume");
    apply(1, 0.7, "easy", "coach.adjust.note.lowVolume");
  } else if (c.weeklyVolume === "0-10") {
    apply(0, 0.7, "easy", "coach.adjust.note.lowVolume");
    apply(1, 0.85, "moderate", "coach.adjust.note.lowVolume");
  }

  if ((c.sleepQuality && c.sleepQuality <= 2) || (c.stressLevel && c.stressLevel >= 4)) {
    apply(0, weeks[0].mult * 0.9, strictestCap(weeks[0].cap, "moderate"), weeks[0].noteKey || "coach.adjust.note.lifestyle");
    apply(1, weeks[1].mult * 0.9, strictestCap(weeks[1].cap, "moderate"), weeks[1].noteKey || "coach.adjust.note.lifestyle");
  }

  return weeks
    .map((w, i) => ({
      weekIndex: i + 1,
      sessionMultiplier: w.mult,
      intensityCap: w.cap,
      noteKey: w.noteKey,
    }))
    .filter((w) => w.sessionMultiplier < 1 || w.intensityCap !== "any");
}

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
  // Elite runners get one extra session per week (capped at 6).
  const baseWeeklySessions = weeklySessionsFor(c.frequency);
  const weeklySessions = c.experience === "elite"
    ? Math.min(6, baseWeeklySessions + 1)
    : baseWeeklySessions;
  return {
    totalWeeks,
    weeklySessions,
    milestones: buildMilestones(totalWeeks),
    earlyAdjustments: buildEarlyAdjustments(c),
  };
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

export function currentWeekAdjustment(
  c: CoachConfig,
  weekIndex: number
): WeekAdjustment | null {
  const plan = getCoachPlan(c);
  return plan.earlyAdjustments.find((a) => a.weekIndex === weekIndex) ?? null;
}
