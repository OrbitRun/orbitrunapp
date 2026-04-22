import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Flag, Sparkles, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  GOAL_IDS,
  loadProfile,
  saveProfile,
  type GoalId,
  type Level,
  type UserProfile,
} from "@/lib/user-profile";
import { defaultLayoutForLevel } from "@/lib/user-profile";
import { saveLayout } from "@/lib/stat-metrics";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [goal, setGoal] = useState<GoalId>("complete5k");

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setName(existing.name);
      setLevel(existing.level);
      setGoal(existing.goal);
    }
  }, []);

  const finish = () => {
    const p: UserProfile = {
      name: name.trim(),
      level,
      goal,
      createdAt: Date.now(),
    };
    saveProfile(p);
    // Apply level-driven default layout if user hasn't customized yet.
    saveLayout(defaultLayoutForLevel(level));
    void navigate({ to: "/" });
  };

  return (
    <main className="mx-auto max-w-md h-[100dvh] flex flex-col px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[max(env(safe-area-inset-bottom),1rem)]">
      <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold text-center">
        {t("onb.step", { n: step + 1 })}
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === step ? "w-8 bg-neon shadow-neon" : i < step ? "w-4 bg-neon/60" : "w-4 bg-white/10"}`}
          />
        ))}
      </div>

      <header className="mt-4 text-center">
        <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] items-center justify-center text-background shadow-neon">
          {step === 0 ? <User className="h-5 w-5" /> : step === 1 ? <Sparkles className="h-5 w-5" /> : <Flag className="h-5 w-5" />}
        </div>
        <h1 className="mt-3 font-display font-black text-2xl tracking-tight">
          {step === 0 ? t("onb.namePrompt") : step === 1 ? t("onb.levelPrompt") : t("onb.goalPrompt")}
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {step === 0 ? t("onb.nameHint") : step === 1 ? t("onb.levelHint") : t("onb.goalHint")}
        </p>
      </header>

      <section className="mt-5 flex-1 min-h-0 overflow-y-auto">
        {step === 0 && (
          <div className="glass-strong rounded-3xl p-5">
            <label className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              {t("profile.name")}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("onb.namePlaceholder")}
              className="mt-2 w-full bg-transparent border-b-2 border-white/10 focus:border-neon focus:shadow-[0_4px_20px_-4px_oklch(0.92_0.21_140/0.5)] outline-none py-3 text-2xl font-display font-bold tracking-tight transition"
              maxLength={24}
            />
          </div>
        )}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-3">
            {(["beginner", "expert"] as Level[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`text-left rounded-2xl p-4 transition active:scale-[0.98] ${
                  level === l
                    ? "bg-neon/10 border-2 border-neon shadow-neon"
                    : "glass border-2 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-display font-black text-xl">{t(`level.${l}`)}</div>
                  {level === l && (
                    <span className="h-6 w-6 rounded-full bg-neon grid place-items-center text-primary-foreground">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t(`level.${l}.desc`)}</div>
              </button>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {GOAL_IDS.map((g) => (
              <button
                key={g}
                onClick={() => setGoal(g)}
                className={`rounded-2xl p-4 text-left transition active:scale-[0.98] ${
                  goal === g
                    ? "bg-neon/10 border-2 border-neon shadow-neon"
                    : "glass border-2 border-transparent"
                }`}
              >
                <div className="font-display font-bold text-base leading-tight">{t(`goal.${g}`)}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-4 pt-3 flex items-center gap-3 shrink-0">
        {step > 0 ? (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="h-12 px-5 rounded-2xl glass flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em]"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("onb.back")}
          </button>
        ) : (
          <button
            onClick={() => void navigate({ to: "/" })}
            className="h-12 px-5 rounded-2xl text-sm font-semibold text-muted-foreground"
          >
            {t("onb.skip")}
          </button>
        )}
        <button
          onClick={() => (step < 2 ? setStep((s) => s + 1) : finish())}
          className="ml-auto h-12 px-6 rounded-2xl bg-neon text-primary-foreground font-black uppercase tracking-[0.18em] text-sm flex items-center gap-2 shadow-neon active:scale-95 transition"
        >
          {step < 2 ? t("onb.next") : t("onb.finish")}
          <ArrowRight className="h-4 w-4" />
        </button>
      </footer>
    </main>
  );
}
