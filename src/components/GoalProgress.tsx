import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, Target as TargetIcon, TrendingUp, X, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { goalLabel, type RunningGoal } from "@/lib/user-profile";
import type { Run } from "@/lib/run-types";
import { bestTimeForPoints } from "@/lib/personal-records";
import { formatDistance, formatPace } from "@/lib/run-utils";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type DistanceTarget = { meters: number; key: "5k" | "10k" | "half" | "marathon" };

const DISTANCE_TARGETS: Partial<Record<RunningGoal, DistanceTarget>> = {
  run5k: { meters: 5000, key: "5k" },
  run10k: { meters: 10000, key: "10k" },
  halfMarathon: { meters: 21097.5, key: "half" },
  marathon: { meters: 42195, key: "marathon" },
};

type Progress = {
  pct: number;
  primary: string;
  caption: string;
  hint: string;
};

function computeDistanceProgress(runs: Run[], target: DistanceTarget): Progress {
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

function bestRecentPace(runs: Run[], windowMs = RECENT_WINDOW_MS): number | null {
  const now = Date.now();
  const recent = runs.filter((r) => now - r.endedAt <= windowMs);
  let best = Infinity;
  for (const r of recent) {
    const t = bestTimeForPoints(r.points, 1000);
    if (t != null && t / 1000 < best) best = t / 1000;
  }
  return isFinite(best) ? best : null;
}

function computeFasterProgress(runs: Run[]): Progress {
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
    return {
      pct: 10,
      primary: formatPace(recentBest),
      caption: "goal.caption.fasterBaseline",
      hint: "goal.hint.fasterBaseline",
    };
  }
  const deltaSec = priorBest - recentBest;
  const pct = Math.max(0, Math.min(100, Math.round((deltaSec / 30) * 100)));
  return {
    pct,
    primary: formatPace(recentBest),
    caption: deltaSec >= 0 ? "goal.caption.fasterDelta" : "goal.caption.slowerDelta",
    hint: deltaSec >= 0 ? "goal.hint.fasterImproved" : "goal.hint.fasterRegressed",
  };
}

function computeWeightLossProgress(runs: Run[]): Progress {
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

// ---------- Suggestion engine ----------

type SuggestionType = "easy" | "long" | "tempo" | "intervals" | "recovery" | "first";

type WorkoutSuggestion = {
  type: SuggestionType;
  distanceKm: number;
  paceSecPerKm: number | null;
  reason: string; // i18n key
  onTrack: boolean;
};

function lastRunDistanceM(runs: Run[]): number {
  if (runs.length === 0) return 0;
  return runs.reduce((m, r) => (r.endedAt > m.endedAt ? r : m), runs[0]).distanceM;
}

function buildSuggestion(
  goal: RunningGoal,
  runs: Run[],
  progress: Progress,
): WorkoutSuggestion {
  if (runs.length === 0) {
    return {
      type: "first",
      distanceKm: 2,
      paceSecPerKm: null,
      reason: "goal.suggest.reason.first",
      onTrack: false,
    };
  }

  const onTrack = progress.pct >= 70;
  const dt = DISTANCE_TARGETS[goal];

  if (dt) {
    const longestM = Math.max(...runs.map((r) => r.distanceM), 0);
    const targetKm = dt.meters / 1000;
    if (onTrack) {
      const distanceKm = Math.max(2, Math.min(targetKm * 0.5, 8));
      const recentBest = bestRecentPace(runs);
      const tempoPace = recentBest ? recentBest + 20 : null;
      return {
        type: "tempo",
        distanceKm: Math.round(distanceKm * 10) / 10,
        paceSecPerKm: tempoPace,
        reason: "goal.suggest.reason.distanceOnTrack",
        onTrack: true,
      };
    }
    const lastKm = longestM / 1000;
    const stretchKm = Math.max(2, Math.min(lastKm + Math.max(0.5, lastKm * 0.15), targetKm));
    return {
      type: "long",
      distanceKm: Math.round(stretchKm * 10) / 10,
      paceSecPerKm: null,
      reason: "goal.suggest.reason.distanceBehind",
      onTrack: false,
    };
  }

  if (goal === "runFaster") {
    const recentBest = bestRecentPace(runs);
    if (onTrack) {
      return {
        type: "easy",
        distanceKm: 4,
        paceSecPerKm: recentBest ? recentBest + 60 : null,
        reason: "goal.suggest.reason.fasterOnTrack",
        onTrack: true,
      };
    }
    return {
      type: "intervals",
      distanceKm: 5,
      paceSecPerKm: recentBest,
      reason: "goal.suggest.reason.fasterBehind",
      onTrack: false,
    };
  }

  if (goal === "weightLoss") {
    const lastKm = lastRunDistanceM(runs) / 1000;
    if (onTrack) {
      return {
        type: "recovery",
        distanceKm: Math.max(3, Math.round(lastKm * 0.8 * 10) / 10),
        paceSecPerKm: null,
        reason: "goal.suggest.reason.weightOnTrack",
        onTrack: true,
      };
    }
    const stretchKm = Math.max(4, Math.min(lastKm + 1, 10));
    return {
      type: "easy",
      distanceKm: Math.round(stretchKm * 10) / 10,
      paceSecPerKm: null,
      reason: "goal.suggest.reason.weightBehind",
      onTrack: false,
    };
  }

  return {
    type: "easy",
    distanceKm: 3,
    paceSecPerKm: null,
    reason: "goal.suggest.reason.default",
    onTrack,
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
  const [showSuggestion, setShowSuggestion] = useState(false);

  const progress = useMemo<Progress>(() => {
    const dt = DISTANCE_TARGETS[goal];
    if (dt) return computeDistanceProgress(runs, dt);
    if (goal === "runFaster") return computeFasterProgress(runs);
    if (goal === "weightLoss") return computeWeightLossProgress(runs);
    return { pct: 0, primary: "—", caption: "", hint: "" };
  }, [goal, runs]);

  const suggestion = useMemo(
    () => buildSuggestion(goal, runs, progress),
    [goal, runs, progress],
  );

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

      <button
        onClick={() => setShowSuggestion((v) => !v)}
        aria-expanded={showSuggestion}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {showSuggestion ? t("goal.suggest.hide") : t("goal.suggest.cta")}
      </button>

      {showSuggestion && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-neon/15 grid place-items-center text-neon shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neon">
                  {t(`goal.suggest.type.${suggestion.type}`)}
                </div>
                <div
                  className={`text-[9px] uppercase tracking-[0.18em] font-black px-1.5 py-0.5 rounded ${
                    suggestion.onTrack
                      ? "bg-neon/15 text-neon"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {t(suggestion.onTrack ? "goal.suggest.onTrack" : "goal.suggest.behind")}
                </div>
              </div>
              <div className="mt-1 font-display font-black text-lg leading-tight">
                {suggestion.distanceKm.toFixed(1)} {t("unit.km")}
                {suggestion.paceSecPerKm != null && (
                  <span className="text-muted-foreground font-bold text-sm ml-2">
                    @ {formatPace(suggestion.paceSecPerKm)} {t("unit.perKm")}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                {t(suggestion.reason)}
              </p>
            </div>
            <button
              onClick={() => setShowSuggestion(false)}
              aria-label={t("goal.suggest.hide")}
              className="h-7 w-7 -mr-1 -mt-1 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <Link
            to="/"
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-[0.98] transition"
          >
            {t("goal.suggest.start")}
          </Link>
        </div>
      )}
    </section>
  );
}
