import { useEffect, useState } from "react";
import { Sparkles, Target as TargetIcon, TrendingUp, X, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  coachGoalLabel,
  nextCoachSession,
  type CoachConfig,
  type UserProfile,
} from "@/lib/user-profile";
import { loadRuns, type Run } from "@/lib/run-types";
import { getPlanProgress } from "@/lib/coach-plan";
import CoachOnboarding from "./CoachOnboarding";

type Props = {
  profile: UserProfile;
};

export default function GoalProgress({ profile }: Props) {
  const { t, lang } = useI18n();
  const [runs, setRuns] = useState<Run[]>([]);
  const [showSession, setShowSession] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    setRuns(loadRuns());
    const onUpdate = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", onUpdate);
    window.addEventListener("orbit:run-stop", onUpdate);
    return () => {
      window.removeEventListener("orbit:run-updated", onUpdate);
      window.removeEventListener("orbit:run-stop", onUpdate);
    };
  }, []);

  // No coach yet: show CTA card.
  if (!profile.coach) {
    return (
      <>
        <section className="mt-4 glass rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold leading-tight">
                {t("goal.progress.title")}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
                {t("coach.profileRow.unset")}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {t("coach.cta.unset")}
          </p>
          <button
            onClick={() => setCoachOpen(true)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("coach.setup")}
          </button>
        </section>
        {coachOpen && <CoachOnboarding onClose={() => setCoachOpen(false)} />}
      </>
    );
  }

  const coach: CoachConfig = profile.coach;
  const progress = getPlanProgress(coach, runs, lang);
  const session = nextCoachSession(profile, lang);

  return (
    <section className="mt-4 glass rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight truncate">
            {t("goal.progress.title")}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5 truncate">
            {progress.weekLabel}
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
          className="h-full rounded-full bg-neon transition-all duration-500"
          style={{ width: `${Math.max(progress.pct, runs.length > 0 ? 2 : 0)}%` }}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="font-display font-black text-base tabular truncate">
          {progress.sessionsDone} / {progress.sessionsPlanned} {t("goal.plan.sessions")}
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold whitespace-nowrap">
          {coachGoalLabel(coach.goal, lang)}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <TargetIcon className="h-3 w-3 text-neon/70 shrink-0" />
        <span className="leading-snug">
          {progress.complete
            ? t("goal.plan.complete")
            : t("goal.plan.weekOf", {
                current: String(progress.weekIndex),
                total: String(progress.totalWeeks),
              })}
        </span>
      </div>

      <button
        onClick={() => setShowSession((v) => !v)}
        aria-expanded={showSession}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {showSession ? t("goal.suggest.hide") : t("coach.detail.cta")}
      </button>

      {showSession && (
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
              <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                {t(session.descriptionKey)}
              </p>
            </div>
            <button
              onClick={() => setShowSession(false)}
              aria-label={t("goal.suggest.hide")}
              className="h-7 w-7 -mr-1 -mt-1 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
