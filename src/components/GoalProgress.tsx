import { useMemo } from "react";
import { TrendingUp, Target as TargetIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { goalLabel, type RunningGoal } from "@/lib/user-profile";
import type { Run } from "@/lib/run-types";
import { bestTimeForPoints } from "@/lib/personal-records";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type DistanceTarget = { meters: number; key: "5k" | "10k" | "half" | "marathon" };

const DISTANCE_TARGETS: Partial<Record<RunningGoal, DistanceTarget>> = {
  run5k: { meters: 5000, key: "5k" },
  run10k: { meters: 10000, key: "10k" },
  halfMarathon: { meters: 21097.5, key: "half" },
  marathon: { meters: 42195, key: "marathon" },
};

type Progress = {
  pct: number; // 0..100
  primary: string; // headline value
  caption: string; // sub-label
  hint: string; // helper line
};

function computeDistanceProgress(
  runs: Run[],
  target: DistanceTarget,
): Progress {
  const recent = runs.filter((r) => Date.now() - r.endedAt <= RECENT_WINDOW_MS);
  const pool = recent.length > 0 ? recent : runs;
  const longest = pool.reduce((m, r) => (r.distanceM > m ? r.distanceM : m), 0);
  const pct = Math.min(100, Math.round((longest / target.meters) * 100));
  return {
    pct,
    primary: `${formatDistance(longest)} / ${formatDistance(target.meters)}`,
    caption: "km",
    hint: pct >= 100 ? "goal.hint.distanceDone" : "goal.hint.distanceMore",
  };
}

function computeFasterProgress(runs: Run[]): Progress {
  // Compare best 1k pace from last 30 days vs the prior 30 days.
  const now = Date.now();
  const recent = runs.filter((r) => now - r.endedAt <= RECENT_WINDOW_MS);
  const prior = runs.filter(
    (r) => now - r.endedAt > RECENT_WINDOW_MS && now - r.endedAt <= 2 * RECENT_WINDOW_MS,
  );
  const bestPace = (rs: Run[]) => {
    let best = Infinity;
    for (const r of rs) {
      const t = bestTimeForPoints(r.points, 1000);
      if (t != null && t / 1000 < best) best = t / 1000;
    }
    return isFinite(best) ? best : null;
  };
  const recentBest = bestPace(recent);
  const priorBest = bestPace(prior);

  if (recentBest == null) {
    return { pct: 0, primary: "—", caption: "goal.caption.faster", hint: "goal.hint.fasterNoData" };
  }
  if (priorBest == null) {
    // No baseline → show current best as 0 progress baseline established.
    return {
      pct: 10,
      primary: formatPace(recentBest),
      caption: "goal.caption.fasterBaseline",
      hint: "goal.hint.fasterBaseline",
    };
  }
  const deltaSec = priorBest - recentBest; // positive = improved
  // Map 30s improvement → 100% (cap at 0..100).
  const pct = Math.max(0, Math.min(100, Math.round((deltaSec / 30) * 100)));
  return {
    pct,
    primary: formatPace(recentBest),
    caption: deltaSec >= 0 ? "goal.caption.fasterDelta" : "goal.caption.slowerDelta",
    hint: deltaSec >= 0 ? "goal.hint.fasterImproved" : "goal.hint.fasterRegressed",
  };
}

function computeWeightLossProgress(runs: Run[]): Progress {
  // Volume target: 20 km / week from last 4 weeks.
  const now = Date.now();
  const fourWeeks = 28 * 24 * 60 * 60 * 1000;
  const recent = runs.filter((r) => now - r.endedAt <= fourWeeks);
  const totalKm = recent.reduce((a, r) => a + r.distanceM, 0) / 1000;
  const perWeek = totalKm / 4;
  const target = 20;
  const pct = Math.min(100, Math.round((perWeek / target) * 100));
  return {
    pct,
    primary: `${perWeek.toFixed(1)} / ${target} km`,
    caption: "goal.caption.perWeek",
    hint: pct >= 100 ? "goal.hint.weightOnTrack" : "goal.hint.weightMore",
  };
}

export default function GoalProgress({
  goal,
  runs,
}: {
  goal: RunningGoal;
  runs: Run[];
}) {
  const { t, lang } = useI18n();

  const progress = useMemo<Progress>(() => {
    const dt = DISTANCE_TARGETS[goal];
    if (dt) return computeDistanceProgress(runs, dt);
    if (goal === "runFaster") return computeFasterProgress(runs);
    if (goal === "weightLoss") return computeWeightLossProgress(runs);
    return { pct: 0, primary: "—", caption: "", hint: "" };
  }, [goal, runs]);

  const hasRuns = runs.length > 0;

  return (
    <section className="mt-4 glass rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold leading-tight">{t("goal.progress.title")}</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
            {goalLabel(goal, lang)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display font-black text-2xl text-neon tabular leading-none">
            {progress.pct}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full rounded-full bg-white/5 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("goal.progress.title")}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-neon to-[oklch(0.7_0.18_175)] shadow-neon transition-all duration-500"
          style={{ width: `${Math.max(progress.pct, hasRuns ? 2 : 0)}%` }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="font-display font-black text-base tabular truncate">
          {progress.primary}
        </div>
        {progress.caption && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold whitespace-nowrap">
            {progress.caption.startsWith("goal.") ? t(progress.caption) : progress.caption}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <TargetIcon className="h-3 w-3 text-neon/70 shrink-0" />
        <span className="leading-snug">
          {hasRuns ? t(progress.hint) : t("goal.hint.empty")}
        </span>
      </div>
    </section>
  );
}
