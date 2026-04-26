import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  loadProfile,
  saveProfile,
  coachLevelLabel,
  coachFrequencyLabel,
  coachGoalLabel,
  type CoachLevel,
  type CoachFrequency,
  type CoachGoal,
} from "@/lib/user-profile";

type Props = { onClose: () => void };

const LEVELS: CoachLevel[] = ["0-2", "3-5", "5-10", "10+"];
const FREQS: CoachFrequency[] = ["1-2", "3-4", "5+"];
const GOALS: CoachGoal[] = ["weightLoss", "finish5k", "faster10k", "halfMarathon", "marathon"];

export default function CoachOnboarding({ onClose }: Props) {
  const { t, lang } = useI18n();
  const existing = loadProfile().coach;
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<CoachLevel>(existing?.level ?? "3-5");
  const [frequency, setFrequency] = useState<CoachFrequency>(existing?.frequency ?? "3-4");
  const [goal, setGoal] = useState<CoachGoal>(existing?.goal ?? "finish5k");

  const finish = () => {
    const p = loadProfile();
    saveProfile({ ...p, coach: { level, frequency, goal, configuredAt: Date.now() } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl p-6 bg-background border border-white/10">
        <div className="flex items-center gap-2 text-foreground/80 mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
            {t("coach.subtitle")}
          </span>
        </div>
        <h2 className="font-display font-black text-2xl tracking-tight">{t("coach.title")}</h2>

        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-foreground" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-6 min-h-[220px]">
          {step === 0 && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.level")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 border ${
                      level === lv
                        ? "bg-foreground text-background border-foreground"
                        : "bg-white/5 border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachLevelLabel(lv, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.frequency")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {FREQS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 border ${
                      frequency === f
                        ? "bg-foreground text-background border-foreground"
                        : "bg-white/5 border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachFrequencyLabel(f, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.goal")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`h-12 px-3 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 border text-left pl-4 ${
                      goal === g
                        ? "bg-foreground text-background border-foreground"
                        : "bg-white/5 border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachGoalLabel(g, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={step === 0 ? onClose : () => setStep(step - 1)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
          >
            {step === 0 ? (
              t("onb.skip")
            ) : (
              <>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("onb.back")}
              </>
            )}
          </button>
          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-[0.15em] active:scale-95 transition flex items-center gap-1.5"
            >
              {t("onb.next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-5 py-2.5 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-[0.15em] active:scale-95 transition flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {t("coach.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
