import { useEffect, useMemo, useState } from "react";
import { Sparkles, Target as TargetIcon, X, Zap, Activity } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  nextCoachSession,
  coachFrequencyLabel,
  coachGoalLabel,
  coachLevelLabel,
  type UserProfile,
} from "@/lib/user-profile";
import { loadRuns, type Run } from "@/lib/run-types";
import { getPlanProgress, currentWeekAdjustment } from "@/lib/coach-plan";
import { predictRaceTimes, PREDICTION_DISTANCES, type PredictionDistance } from "@/lib/performance-prediction";
import { loadHistory, monthlyDelta } from "@/lib/prediction-history";
import { bestEstimateVo2MaxWithSource, bestVo2MaxFromRuns, classifyFitnessByProfile } from "@/lib/vo2max";
import { useVitals } from "@/hooks/use-vitals";
import CoachOnboarding from "@/components/CoachOnboarding";
import InfoHint from "@/components/InfoHint";

type Props = { profile: UserProfile };

export default function CoachCard({ profile }: Props) {
  const { t, lang } = useI18n();
  const [showDetail, setShowDetail] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const configured = !!profile.coach;

  useEffect(() => {
    if (!configured) return;
    setRuns(loadRuns());
    const onUpdate = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", onUpdate);
    window.addEventListener("orbit:run-stop", onUpdate);
    return () => {
      window.removeEventListener("orbit:run-updated", onUpdate);
      window.removeEventListener("orbit:run-stop", onUpdate);
    };
  }, [configured]);

  // Unconfigured: single unified empty card.
  if (!configured) {
    return (
      <>
        <section className="mt-1 mb-3 glass rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold leading-tight">
                {t("coach.cardTitle")}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
                {t("coach.profileRow.unset")}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t("coach.empty.body")}
          </p>
          <button
            onClick={() => setOnboarding(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("coach.empty.cta")}
          </button>
        </section>
        {onboarding && <CoachOnboarding onClose={() => setOnboarding(false)} />}
      </>
    );
  }

  const coach = profile.coach!;
  const session = nextCoachSession(profile, lang);
  const progress = getPlanProgress(coach, runs, lang);
  const goalText = coachGoalLabel(coach.goal, lang, coach.fasterDistance);
  const contextLine = `${coachFrequencyLabel(coach.frequency, lang)} · ${goalText}`;

  // Zone-5 stress override: surface the coach's "rest day" message when the
  // latest run shows >15% time at ≥90% maxHR, regardless of subjective RPE.
  const lastRun = runs.length > 0 ? [...runs].sort((a, b) => b.startedAt - a.startedAt)[0] : null;
  const z5Override = lastRun && (lastRun.zone5PctTime ?? 0) > 15;

  return (
    <>
      <section className="mt-1 mb-3 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight">{t("coach.cardTitle")}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
              {t("coach.next")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-black tabular leading-none">
              {coachLevelLabel(coach.level, lang)}
            </div>
          </div>
        </div>

        <div className="font-display font-black text-base tabular truncate">
          {session.title}
        </div>

        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <TargetIcon className="h-3 w-3 text-neon/70 shrink-0" />
          <span className="leading-snug truncate">{contextLine}</span>
        </div>
        {(() => {
          const adj = currentWeekAdjustment(coach, progress.weekIndex);
          if (!adj || !adj.noteKey) return null;
          return (
            <div className="mt-2 text-[10px] text-neon font-bold uppercase tracking-[0.12em]">
              {t(adj.noteKey)}
            </div>
          );
        })()}
        <PredictionInsightLine runs={runs} />

        {z5Override && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
            <Zap className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-snug">
              {t("coach.zone5Override")}
            </p>
          </div>
        )}

        <button
          onClick={() => setShowDetail((v) => !v)}
          aria-expanded={showDetail}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {showDetail ? t("coach.detail.hide") : t("coach.detail.cta")}
        </button>

        {showDetail && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-neon/15 grid place-items-center text-neon shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neon">
                  {session.summary}
                </div>
                <div className="mt-1 font-display font-black text-lg leading-tight">
                  {session.title}
                </div>
                <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                  {t("coach.session.howto")}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                  {t(session.descriptionKey)}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                aria-label={t("coach.detail.hide")}
                className="h-7 w-7 -mr-1 -mt-1 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={() => setShowDetail(false)}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] active:scale-[0.98] transition"
            >
              {t("coach.session.startCta")}
            </button>
          </div>
        )}

        {/* Discrete progress strip */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {progress.complete
                ? t("goal.plan.complete")
                : t("goal.plan.weekOf", {
                    current: String(progress.weekIndex),
                    total: String(progress.totalWeeks),
                  })}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-neon font-black tabular">
              {progress.pct}%
            </div>
          </div>
          <div
            className="h-1 w-full rounded-full bg-white/5 overflow-hidden"
            role="progressbar"
            aria-valuenow={progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-neon transition-all duration-500"
              style={{ width: `${Math.max(progress.pct, runs.length > 0 ? 2 : 0)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground tabular">
            {progress.sessionsDone} / {progress.sessionsPlanned} {t("goal.plan.sessions")}
          </div>
        </div>

        <Vo2MaxTile profile={profile} runs={runs} />
      </section>
      {onboarding && <CoachOnboarding onClose={() => setOnboarding(false)} />}
    </>
  );
}

function PredictionInsightLine({ runs }: { runs: Run[] }) {
  const { t } = useI18n();
  const insight = useMemo(() => {
    const predictions = predictRaceTimes(runs);
    if (Object.keys(predictions).length === 0) return null;
    const history = loadHistory();
    const preferred: PredictionDistance[] = ["10k", "5k", "half"];
    for (const id of preferred) {
      const d = monthlyDelta(history, predictions, id);
      if (d && d.deltaMs <= -1000) {
        const abs = Math.abs(Math.round(d.deltaMs / 1000));
        const value =
          abs < 60 ? `${abs}s` : `${Math.floor(abs / 60)}m ${(abs % 60).toString().padStart(2, "0")}s`;
        const distance = t(`prediction.distance.${id}` as const);
        return t("prediction.coach.fasterMonth", { distance, value });
      }
    }
    return null;
    // re-evaluate when runs identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runs, t]);

  if (!insight) return null;
  // Discrete neon line, matches the existing weekly-adjustment treatment.
  // Use lowercase override since the surrounding adjustment uses uppercase tracking.
  const _ = PREDICTION_DISTANCES; // keep import
  void _;
  return (
    <div className="mt-2 text-[11px] text-neon font-bold leading-snug">
      {insight}
    </div>
  );
}

function Vo2MaxTile({ profile, runs }: { profile: UserProfile; runs: Run[] }) {
  const { t } = useI18n();
  const coach = profile.coach;
  const vitals = useVitals();
  const { value, source } = useMemo<{
    value: number | null;
    source: "user" | "hr" | "pace" | null;
  }>(() => {
    if (coach?.preferKnownVo2max && coach.vo2maxKnown && coach.vo2maxKnown > 0) {
      return { value: coach.vo2maxKnown, source: "user" };
    }
    const opts = { coach, restHr: vitals.restingHr };
    const best = bestVo2MaxFromRuns(runs, opts);
    if (best) {
      const r = runs.find((x) => x.id === best.runId);
      const src = (r?.vo2maxSource as "hr" | "pace" | "user" | undefined) ?? "pace";
      return { value: best.value, source: src };
    }
    if (coach?.vo2maxKnown && coach.vo2maxKnown > 0) {
      return { value: coach.vo2maxKnown, source: "user" };
    }
    const latest = runs.length > 0 ? [...runs].sort((a, b) => b.startedAt - a.startedAt)[0] : null;
    const est = latest ? bestEstimateVo2MaxWithSource(latest, opts) : null;
    return est ? { value: est.value, source: est.source } : { value: null, source: null };
  }, [coach, runs, vitals.restingHr]);

  const band = value != null ? classifyFitnessByProfile(value, coach?.age, coach?.gender) : null;
  const sourceLabel =
    source === "user"
      ? t("vo2max.source.user")
      : source === "hr"
        ? t("vo2max.source.hr")
        : source === "pace"
          ? t("vo2max.source.pace")
          : null;

  return (
    <div className="mt-4 pt-3 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-neon" />
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            {t("vo2max.label")}
          </div>
          <InfoHint label={t("vo2max.label")} text={t("vo2max.info")} />
        </div>
        {band && (
          <div className="text-[10px] uppercase tracking-[0.18em] font-black text-neon">
            {t(`vo2max.band.${band}`)}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display font-black text-3xl tabular text-neon leading-none">
          {value != null ? value.toFixed(1) : "—"}
        </span>
        <span className="text-[11px] text-muted-foreground font-bold">{t("vo2max.unit")}</span>
        {sourceLabel && (
          <span className="ml-auto text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            {sourceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
