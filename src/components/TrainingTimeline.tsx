import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, Circle, Pencil, Sparkles, XCircle, CalendarDays } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useVitals } from "@/hooks/use-vitals";
import { loadRuns, type Run } from "@/lib/run-types";
import { computeTrimp } from "@/lib/readiness-engine";
import { loadHrZones } from "@/lib/hr-zones-config";
import { buildPlan, type PlannedSession } from "@/lib/training-plan";
import { phaseLabel } from "@/lib/coach-plan";
import GoalEditorSheet from "@/components/GoalEditorSheet";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_MS = 86400000;

function StatusIcon({ status }: { status: PlannedSession["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-neon" />;
  if (status === "skipped") return <XCircle className="h-4 w-4 text-muted-foreground" />;
  if (status === "adjusted")
    return <Sparkles className="h-4 w-4" style={{ color: "oklch(0.78 0.18 60)" }} />;
  return <Circle className="h-4 w-4 text-muted-foreground/40" />;
}

function phaseColor(phase: string): string {
  if (phase === "build") return "oklch(0.78 0.18 60)";
  if (phase === "peak") return "var(--destructive)";
  if (phase === "taper") return "oklch(0.7 0.12 220)";
  return "var(--neon)";
}

export default function TrainingTimeline() {
  const { t, lang } = useI18n();
  const profile = useUserProfile();
  const vitals = useVitals();
  const [runs, setRuns] = useState<Run[]>([]);
  const [editing, setEditing] = useState(false);

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

  const plan = useMemo(() => {
    if (!profile.coach) return null;
    const hr = loadHrZones();
    const now = Date.now();
    const last7 = runs.filter((r) => r.endedAt >= now - 7 * DAY_MS);
    const prev7 = runs.filter(
      (r) => r.endedAt >= now - 14 * DAY_MS && r.endedAt < now - 7 * DAY_MS,
    );
    const trimp = (rs: Run[]) =>
      rs.reduce(
        (s, r) => s + (r.trimp ?? computeTrimp(r, hr ? { restingHr: hr.restingHr, maxHr: hr.maxHr } : null)),
        0,
      );
    const t7 = trimp(last7);
    const t14 = trimp(prev7);
    const load7dRatio = t14 > 0 ? t7 / t14 : undefined;

    let hrvDropPct: number | undefined;
    if (vitals.history && vitals.history.length >= 4 && vitals.hrvMs) {
      const olderHrv = vitals.history
        .slice(0, -1)
        .map((s) => s.hrvMs)
        .filter((x): x is number => typeof x === "number");
      if (olderHrv.length >= 3) {
        const avg = olderHrv.reduce((a, b) => a + b, 0) / olderHrv.length;
        hrvDropPct = ((vitals.hrvMs - avg) / avg) * 100;
      }
    }
    return buildPlan(profile.coach, { runs, load7dRatio, hrvDropPct }, profile.onboardingData);
  }, [profile.coach, profile.onboardingData, runs, vitals]);

  if (!plan || !profile.coach) return null;

  return (
    <>
      <section className="mt-1 mb-3 glass rounded-2xl p-4">
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              {t("plan.title")}
            </div>
            <div className="font-display font-black text-xl tabular leading-tight mt-0.5">
              {t("plan.weekOf", {
                current: String(plan.weekIndex),
                total: String(plan.totalWeeks),
              })}
            </div>
            <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
              {plan.doneSessions} / {plan.totalSessions} {t("plan.sessions")}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="font-display font-black text-2xl text-neon tabular leading-none">
              {plan.pct}%
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/80 hover:bg-white/10 active:scale-95 transition"
            >
              <Pencil className="h-3 w-3" />
              {t("plan.editGoal")}
            </button>
          </div>
        </header>

        <div
          className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden mb-4"
          role="progressbar"
          aria-valuenow={plan.pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-neon transition-all duration-500"
            style={{ width: `${Math.max(plan.pct, 2)}%` }}
          />
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue={`week-${plan.weekIndex}`}
          className="w-full"
        >
          {plan.weeks.map((w) => {
            const color = phaseColor(w.phase);
            const maxKm = Math.max(...plan.weeks.map((x) => x.totalKm));
            const barPct = Math.max(8, (w.totalKm / Math.max(1, maxKm)) * 100);
            return (
              <AccordionItem
                key={w.weekIndex}
                value={`week-${w.weekIndex}`}
                className="border-b border-white/5 last:border-b-0"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className="w-10 text-[11px] font-black tabular text-foreground/80 text-left">
                      {t("plan.weekShort")} {w.weekIndex}
                    </div>
                    <div
                      className="text-[9px] uppercase tracking-[0.18em] font-black px-2 py-0.5 rounded-full"
                      style={{
                        color,
                        backgroundColor: `color-mix(in oklab, ${color} 15%, transparent)`,
                      }}
                    >
                      {phaseLabel(w.phase, lang)}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${barPct}%`,
                            backgroundColor: w.isPast ? "color-mix(in oklab, var(--neon) 40%, transparent)" : color,
                            opacity: w.isEstimated ? 0.5 : 1,
                          }}
                        />
                      </div>
                      <div className="text-[11px] font-bold tabular text-foreground/80 shrink-0">
                        {w.totalKm} km
                      </div>
                    </div>
                    {w.isCurrent && (
                      <div className="text-[9px] uppercase tracking-[0.18em] font-black text-neon">
                        {t("plan.now")}
                      </div>
                    )}
                    {w.isEstimated && (
                      <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                        {t("plan.estimated")}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3">
                  <ul className="space-y-1.5">
                    {w.sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5"
                      >
                        <StatusIcon status={s.status} />
                        <div className="w-9 text-[10px] uppercase tracking-[0.15em] font-black text-muted-foreground">
                          {t(`trimp.day.${DAY_KEYS[s.dayIndex]}`)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">
                            {t(s.titleKey)}
                          </div>
                          {s.adjustedReasonKey && (
                            <div
                              className="text-[10px] font-semibold truncate"
                              style={{ color: "oklch(0.78 0.18 60)" }}
                            >
                              {t(s.adjustedReasonKey)}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] font-black tabular text-foreground/80 shrink-0">
                          {s.distanceKm} km
                        </div>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>
      {editing && <GoalEditorSheet onClose={() => setEditing(false)} />}
    </>
  );
}
