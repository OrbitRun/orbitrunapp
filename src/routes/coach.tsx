import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useUserProfile } from "@/hooks/use-user-profile";
import { loadRuns, type Run } from "@/lib/run-types";
import ReadinessPanel from "@/components/ReadinessPanel";
import CoachCard from "@/components/CoachCard";
import WeeklyTrimpBreakdown from "@/components/WeeklyTrimpBreakdown";
import TrainingTimeline from "@/components/TrainingTimeline";

export const Route = createFileRoute("/coach")({
  component: CoachPage,
});

function CoachPage() {
  const { t } = useI18n();
  const profile = useUserProfile();
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    setRuns(loadRuns());
    const refresh = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", refresh);
    window.addEventListener("orbit:run-stop", refresh);
    return () => {
      window.removeEventListener("orbit:run-updated", refresh);
      window.removeEventListener("orbit:run-stop", refresh);
    };
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-24">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("coach.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("coach.tabTitle")}</h1>
      </header>

      <ReadinessPanel />
      <CoachCard profile={profile} />
      {runs.length > 0 && <WeeklyTrimpBreakdown runs={runs} />}
      <TrainingTimeline />
    </main>
  );
}
