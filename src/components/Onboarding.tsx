import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  saveProfile,
  type ExperienceLevel,
  type RunningGoal,
  type UserProfile,
  goalLabel,
} from "@/lib/user-profile";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, lang } = useI18n();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<RunningGoal>("run5k");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");

  const goals: RunningGoal[] = ["run5k", "runFaster", "weightLoss", "marathon"];

  const finish = () => {
    const profile: UserProfile = {
      name: name.trim(),
      goal,
      level,
      audioCueMeters: level === "beginner" ? 500 : 1000,
      hapticEnabled: true,
      windUnit: "ms",
      onboarded: true,
    };
    saveProfile(profile);
    onDone();
  };

  const skip = () => {
    saveProfile({ name: "", goal: "run5k", level: "beginner", audioCueMeters: 500, hapticEnabled: true, windUnit: "ms", onboarded: true });
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-2 text-neon mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
            {t("onb.subtitle")}
          </span>
        </div>
        <h2 className="font-display font-black text-2xl tracking-tight">{t("onb.title")}</h2>

        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-neon" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-6 min-h-[200px]">
          {step === 0 && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.name")}</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
                className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-base font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-neon focus:shadow-neon transition"
                maxLength={24}
              />
            </div>
          )}

          {step === 1 && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.goal")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {goals.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`h-14 px-3 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 flex items-center justify-center text-center leading-tight ${
                      goal === g
                        ? "bg-neon text-primary-foreground shadow-neon"
                        : "bg-white/5 text-foreground/80 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {goalLabel(g, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.level")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["beginner", "expert"] as ExperienceLevel[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={`p-4 rounded-2xl text-left transition active:scale-95 ${
                      level === lv
                        ? "bg-neon/15 border-2 border-neon shadow-neon"
                        : "bg-white/5 border-2 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className={`text-sm font-black uppercase tracking-[0.12em] ${level === lv ? "text-neon" : ""}`}>
                      {t(`profile.level.${lv}`)}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
                      {t(`profile.level.${lv}Hint`)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={step === 0 ? skip : () => setStep(step - 1)}
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
              className="px-5 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5"
            >
              {t("onb.next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-5 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {t("onb.finish")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
