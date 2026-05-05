import { useState } from "react";
import { Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  loadProfile,
  saveProfile,
  coachToRunningGoal,
  type CoachAmbition,
  type CoachGoal,
} from "@/lib/user-profile";

type Props = { onClose: () => void };

const DISTANCES: { goal: CoachGoal; labelKey: string }[] = [
  { goal: "finish5k", labelKey: "plan.dist.5k" },
  { goal: "finish10k", labelKey: "plan.dist.10k" },
  { goal: "halfMarathon", labelKey: "plan.dist.half" },
  { goal: "marathon", labelKey: "plan.dist.marathon" },
];

const AMBITIONS: { value: CoachAmbition; labelKey: string }[] = [
  { value: "finish", labelKey: "plan.amb.finish" },
  { value: "pr", labelKey: "plan.amb.pr" },
  { value: "elite", labelKey: "plan.amb.elite" },
];

export default function GoalEditorSheet({ onClose }: Props) {
  const { t } = useI18n();
  const profile = loadProfile();
  const c = profile.coach;
  const [goal, setGoal] = useState<CoachGoal>(c?.goal ?? "finish5k");
  const [targetDate, setTargetDate] = useState<string>(c?.targetDate ?? "");
  const [ambition, setAmbition] = useState<CoachAmbition>(c?.ambition ?? "finish");

  const minDate = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const save = () => {
    const p = loadProfile();
    const distanceChanged = !p.coach || p.coach.goal !== goal;
    const nextCoach = {
      level: p.coach?.level ?? "3-5",
      frequency: p.coach?.frequency ?? "3-4",
      goal,
      fasterDistance: p.coach?.fasterDistance,
      configuredAt: distanceChanged ? Date.now() : p.coach!.configuredAt,
      targetDate: targetDate || undefined,
      ambition,
    } as const;
    saveProfile({
      ...p,
      coach: nextCoach,
      goal: coachToRunningGoal(nextCoach),
      coachEnabled: p.coachEnabled === false ? false : true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 shadow-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              {t("plan.editor.eyebrow")}
            </div>
            <h2 className="font-display font-black text-2xl tracking-tight mt-1">
              {t("plan.editor.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {t("plan.editor.distance")}
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DISTANCES.map((d) => (
                <button
                  key={d.goal}
                  onClick={() => setGoal(d.goal)}
                  className={`h-12 rounded-2xl text-xs font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                    goal === d.goal
                      ? "bg-neon text-primary-foreground"
                      : "bg-white/5 border border-white/10 text-foreground/80"
                  }`}
                >
                  {t(d.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {t("plan.editor.targetDate")}
            </label>
            <input
              type="date"
              value={targetDate}
              min={minDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-2 w-full h-12 px-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-foreground tabular focus:outline-none focus:border-neon/40"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {t("plan.editor.ambition")}
            </label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {AMBITIONS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setAmbition(a.value)}
                  className={`h-12 rounded-2xl text-[11px] font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                    ambition === a.value
                      ? "bg-neon text-primary-foreground"
                      : "bg-white/5 border border-white/10 text-foreground/80"
                  }`}
                >
                  {t(a.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={save}
          className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition"
        >
          <Check className="h-3.5 w-3.5" />
          {t("plan.editor.save")}
        </button>
      </div>
    </div>
  );
}
