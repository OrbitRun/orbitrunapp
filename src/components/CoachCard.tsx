import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, Coffee, Play, Sparkles, Target as TargetIcon, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import {
  nextCoachSession,
  coachFrequencyLabel,
  coachGoalLabel,
  coachLevelLabel,
  type UserProfile,
  type CoachSession,
} from "@/lib/user-profile";
import { loadRuns, type Run } from "@/lib/run-types";
import { getPlanProgress } from "@/lib/coach-plan";
import CoachOnboarding from "@/components/CoachOnboarding";
import { useVitals } from "@/hooks/use-vitals";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useCurrentEnv } from "@/hooks/use-current-env";
import { computeReadiness, type ReadinessBand, type ReadinessResult } from "@/lib/readiness-engine";
import { savePlannedSession, loadPlannedSession } from "@/lib/planned-session";

type Props = { profile: UserProfile };

function bandColor(band: ReadinessResult["band"]): string {
  switch (band) {
    case "rest":
      return "var(--destructive)";
    case "easy":
      return "oklch(0.78 0.18 60)";
    case "ready":
    case "prime":
      return "var(--neon)";
  }
}

function recommendedSession(band: ReadinessBand, baseSession: CoachSession, lang: "en" | "da"): CoachSession {
  const da = lang === "da";
  if (band === "rest") {
    return {
      type: "walkRun",
      title: da ? "Aktiv restitution: 20 min gang" : "Active recovery: 20 min walk",
      summary: da ? "Lav puls · pust ud" : "Low HR · let the body reset",
      descriptionKey: "coach.desc.walkRun",
    };
  }
  if (band === "easy") {
    return {
      type: "easy",
      title: da ? "Roligt løb 20–30 min" : "Easy run 20–30 min",
      summary: da ? "Samtaletempo · zone 2" : "Conversational · zone 2",
      descriptionKey: "coach.desc.easy",
    };
  }
  return baseSession;
}

export default function CoachCard({ profile }: Props) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [saved, setSaved] = useState(false);
  const vitals = useVitals();
  const hrZones = useHrZones();
  const env = useCurrentEnv();
  const configured = !!profile.coach;

  useEffect(() => {
    setSaved(!!loadPlannedSession());
  }, []);

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
              <div className="text-sm font-semibold leading-tight">{t("coach.cardTitle")}</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
                {t("coach.profileRow.unset")}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">{t("coach.empty.body")}</p>
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
  const baseSession = nextCoachSession(profile, lang);
  const progress = getPlanProgress(coach, runs, lang);
  const goalText = coachGoalLabel(coach.goal, lang, coach.fasterDistance);
  const contextLine = `${coachFrequencyLabel(coach.frequency, lang)} · ${goalText}`;

  const readiness = useMemo(
    () => computeReadiness({ runs, vitals, hrZones, env }),
    [runs, vitals, hrZones, env],
  );
  const session = recommendedSession(readiness.band, baseSession, lang);
  const color = bandColor(readiness.band);
  const bandLabel = t(`readiness.band.${readiness.band}`);
  const recommendation = t(
    readiness.recommendationKey,
    readiness.recommendationParams as Record<string, string>,
  );
  const restMode = readiness.band === "rest";

  const lastRun = runs.length > 0 ? [...runs].sort((a, b) => b.startedAt - a.startedAt)[0] : null;
  const z5Override = lastRun && (lastRun.zone5PctTime ?? 0) > 15;

  const handleStart = () => {
    savePlannedSession({ session, band: readiness.band, score: readiness.score });
    void navigate({ to: "/", search: { autostart: 1 } });
  };

  const handleSave = () => {
    savePlannedSession({ session, band: readiness.band, score: readiness.score });
    setSaved(true);
    toast.success(t("coach.actions.saved"));
  };

  return (
    <>
      <section
        className="mt-1 mb-3 glass rounded-2xl p-4"
        style={{ borderColor: "color-mix(in oklab, " + color + " 35%, transparent)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold leading-tight">{t("coach.cardTitle")}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
              {t("readiness.title")}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display font-black tabular leading-none">
              <span className="text-2xl" style={{ color }}>{readiness.score}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
                {t("readiness.score.of")}
              </span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-black tabular leading-none mt-1">
              {coachLevelLabel(coach.level, lang)}
            </div>
          </div>
        </div>

        {/* Score progress bar */}
        <div
          className="mt-3 h-[3px] w-full bg-white/5 overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={readiness.score}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${readiness.score}%`, backgroundColor: color }}
          />
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" style={{ color }} />
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color }}>
            {bandLabel}
          </span>
        </div>

        {/* AI recommendation */}
        <p className="mt-2 text-[12px] leading-snug text-foreground">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mr-1">
            {t("readiness.coach")}:
          </span>
          {recommendation}
        </p>

        {/* Next session */}
        <div className="mt-3 rounded-xl bg-white/5 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">
            {t("coach.next")}
          </div>
          <div className="font-display font-black text-base tabular leading-tight">{session.title}</div>
          <div className="text-[11px] text-muted-foreground mt-1">{session.summary}</div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
            <TargetIcon className="h-3 w-3 text-neon/70 shrink-0" />
            <span className="leading-snug truncate">{contextLine}</span>
          </div>
        </div>

        {z5Override && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 flex gap-2">
            <Zap className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-foreground leading-snug">{t("coach.zone5Override")}</p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          onClick={handleStart}
          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neon text-primary-foreground text-sm font-black uppercase tracking-[0.18em] shadow-neon active:scale-[0.98] transition"
        >
          {restMode ? <Coffee className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {restMode ? t("coach.actions.startRecovery") : t("coach.actions.startWorkout")}
        </button>

        {/* Secondary actions */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-foreground text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white/10 active:scale-[0.98] transition"
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-neon" /> : <Bookmark className="h-3.5 w-3.5" />}
            {saved ? t("coach.actions.saved") : t("coach.actions.savePlan")}
          </button>
          <button
            onClick={() => setShowDetail((v) => !v)}
            aria-expanded={showDetail}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neon/10 border border-neon/30 text-neon text-[11px] font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showDetail ? t("coach.detail.hide") : t("coach.detail.cta")}
          </button>
        </div>

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
                <div className="mt-1 font-display font-black text-lg leading-tight">{session.title}</div>
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
          </div>
        )}

        {/* Plan progress strip */}
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
