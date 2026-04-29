import { useEffect, useState } from "react";
import { Sparkles, Target as TargetIcon, X, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  nextCoachSession,
  coachFrequencyLabel,
  coachGoalLabel,
  coachLevelLabel,
  type UserProfile,
} from "@/lib/user-profile";
import { loadRuns, type Run } from "@/lib/run-types";
import { getPlanProgress } from "@/lib/coach-plan";
import CoachOnboarding from "@/components/CoachOnboarding";

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
      </section>
      {onboarding && <CoachOnboarding onClose={() => setOnboarding(false)} />}
    </>
  );
}
