import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookmarkCheck, Bookmark, Coffee, Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useVitals } from "@/hooks/use-vitals";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useCurrentEnv } from "@/hooks/use-current-env";
import { computeReadiness, type ReadinessBand } from "@/lib/readiness-engine";
import { loadRuns } from "@/lib/run-types";
import { nextCoachSession, type CoachSession } from "@/lib/user-profile";
import { savePlannedSession, loadPlannedSession } from "@/lib/planned-session";
import { toast } from "sonner";

function recommendedSession(
  band: ReadinessBand,
  baseSession: CoachSession,
  lang: "en" | "da",
): CoachSession {
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
  // ready / prime → use the coach's planned session
  return baseSession;
}

export default function ReadinessActions() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const profile = useUserProfile();
  const vitals = useVitals();
  const hrZones = useHrZones();
  const env = useCurrentEnv();
  const [saved, setSaved] = useState(() => !!loadPlannedSession());

  const { band, score, session } = useMemo(() => {
    const runs = loadRuns();
    const r = computeReadiness({ runs, vitals, hrZones, env });
    const base = nextCoachSession(profile, lang);
    return { band: r.band, score: r.score, session: recommendedSession(r.band, base, lang) };
  }, [profile, vitals, hrZones, env, lang]);

  const handleStart = () => {
    savePlannedSession({ session, band, score });
    void navigate({ to: "/" });
  };

  const handleSave = () => {
    savePlannedSession({ session, band, score });
    setSaved(true);
    toast.success(t("coach.actions.saved"));
  };

  const restMode = band === "rest";

  return (
    <section className="mt-1 mb-3 glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-neon">
          {t("coach.actions.title")}
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
          {t(`readiness.band.${band}`)}
        </div>
      </div>

      <div className="rounded-xl bg-white/5 px-3 py-2.5 mb-3">
        <div className="text-sm font-bold leading-tight">{session.title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{session.summary}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleStart}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-neon text-primary-foreground text-[11px] font-black uppercase tracking-[0.15em] active:scale-[0.98] transition"
        >
          {restMode ? <Coffee className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {restMode ? t("coach.actions.startRecovery") : t("coach.actions.startWorkout")}
        </button>
        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-[11px] font-black uppercase tracking-[0.15em] hover:bg-white/10 active:scale-[0.98] transition"
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-neon" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? t("coach.actions.saved") : t("coach.actions.savePlan")}
        </button>
      </div>
    </section>
  );
}
