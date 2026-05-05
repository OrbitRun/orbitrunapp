import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  saveProfile,
  type ExperienceLevel,
  type RunningGoal,
  type UserProfile,
  type WeeklyKm,
  type ExperienceTier,
  type Scale1to5,
  type OnboardingData,
  goalLabel,
} from "@/lib/user-profile";

type StepKey =
  | "name"
  | "goal"
  | "level"
  | "weeklyKm"
  | "experience"
  | "sleep"
  | "stress"
  | "injuries"
  | "preferredDays"
  | "summary";

const STEPS: StepKey[] = [
  "name",
  "goal",
  "level",
  "weeklyKm",
  "experience",
  "sleep",
  "stress",
  "injuries",
  "preferredDays",
  "summary",
];

const WEEKLY_KM_OPTIONS: WeeklyKm[] = ["0", "0-10", "10-25", "25+"];
const EXPERIENCE_TIERS: ExperienceTier[] = ["newbie", "casual", "regular", "experienced"];
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function BigButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-h-[56px] px-4 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 flex items-center justify-center text-center leading-tight ${
        active
          ? "bg-neon text-primary-foreground shadow-neon"
          : "bg-white/5 border border-white/10 text-foreground/85 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState<RunningGoal>("run5k");
  const [level, setLevel] = useState<ExperienceLevel>("beginner");
  const [data, setData] = useState<OnboardingData>({
    sleepQuality: 3,
    stressLevel: 3,
    hasInjuries: false,
    preferredDays: [0, 2, 5],
  });

  const goals: RunningGoal[] = ["run5k", "run10k", "halfMarathon", "marathon", "runFaster", "weightLoss"];
  const current = STEPS[step];
  const totalSteps = STEPS.length;

  const persistAll = (extra?: Partial<UserProfile>) => {
    const profile: UserProfile = {
      name: name.trim(),
      goal,
      level,
      audioCueMeters: level === "beginner" ? 500 : 1000,
      hapticEnabled: true,
      prVoiceEnabled: true,
      windUnit: "ms",
      onboarded: true,
      onboardingData: data,
      ...extra,
    };
    saveProfile(profile);
  };

  const finish = () => {
    persistAll();
    onDone();
    navigate({ to: "/coach" });
  };

  const skip = () => {
    saveProfile({
      name: "",
      goal: "run5k",
      level: "beginner",
      audioCueMeters: 500,
      hapticEnabled: true,
      prVoiceEnabled: true,
      windUnit: "ms",
      onboarded: true,
    });
    onDone();
  };

  const toggleDay = (d: number) => {
    setData((prev) => {
      const cur = prev.preferredDays ?? [];
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      return { ...prev, preferredDays: next.sort((a, b) => a - b) };
    });
  };

  const canAdvance = (() => {
    if (current === "weeklyKm") return !!data.weeklyKm;
    if (current === "experience") return !!data.experience;
    if (current === "preferredDays") return (data.preferredDays?.length ?? 0) >= 1;
    return true;
  })();

  const isLast = step === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5 overflow-y-auto py-8">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-2 text-neon mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
            {t("onb.subtitle")}
          </span>
        </div>
        <h2 className="font-display font-black text-2xl tracking-tight">{t("onb.title")}</h2>

        <div className="mt-4 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${i <= step ? "bg-neon" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-6 min-h-[260px]">
          {current === "name" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.name")}</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("profile.namePlaceholder")}
                className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-base font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-neon focus:shadow-neon transition"
                maxLength={24}
              />
            </div>
          )}

          {current === "goal" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.goal")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {goals.map((g) => (
                  <BigButton key={g} active={goal === g} onClick={() => setGoal(g)}>
                    {goalLabel(g, lang)}
                  </BigButton>
                ))}
              </div>
            </div>
          )}

          {current === "level" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.level")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {(["beginner", "expert"] as ExperienceLevel[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={`p-4 rounded-2xl text-left transition active:scale-95 min-h-[80px] ${
                      level === lv
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border-2 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-black uppercase tracking-[0.12em]">
                      {t(`profile.level.${lv}`)}
                    </div>
                    <div
                      className={`mt-1 text-[10px] leading-tight ${level === lv ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                    >
                      {t(`profile.level.${lv}Hint`)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "weeklyKm" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.weeklyKm")}</label>
              <p className="text-[11px] text-muted-foreground mt-1">{t("onb.hint.weeklyKm")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {WEEKLY_KM_OPTIONS.map((k) => (
                  <BigButton
                    key={k}
                    active={data.weeklyKm === k}
                    onClick={() => setData({ ...data, weeklyKm: k })}
                  >
                    {t(`onb.weeklyKm.${k}`)}
                  </BigButton>
                ))}
              </div>
            </div>
          )}

          {current === "experience" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.experience")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {EXPERIENCE_TIERS.map((tier) => (
                  <BigButton
                    key={tier}
                    active={data.experience === tier}
                    onClick={() => setData({ ...data, experience: tier })}
                  >
                    {t(`onb.experience.${tier}`)}
                  </BigButton>
                ))}
              </div>
            </div>
          )}

          {current === "sleep" && (
            <ScaleStep
              label={t("onb.step.sleep")}
              hint={t("onb.hint.sleep")}
              lowKey="onb.scale.sleepLow"
              highKey="onb.scale.sleepHigh"
              value={data.sleepQuality ?? 3}
              onChange={(v) => setData({ ...data, sleepQuality: v })}
              t={t}
            />
          )}

          {current === "stress" && (
            <ScaleStep
              label={t("onb.step.stress")}
              hint={t("onb.hint.stress")}
              lowKey="onb.scale.stressLow"
              highKey="onb.scale.stressHigh"
              value={data.stressLevel ?? 3}
              onChange={(v) => setData({ ...data, stressLevel: v })}
              t={t}
            />
          )}

          {current === "injuries" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.injuries")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <BigButton
                  active={data.hasInjuries === false}
                  onClick={() => setData({ ...data, hasInjuries: false, injuryNotes: "" })}
                >
                  {t("onb.injuries.no")}
                </BigButton>
                <BigButton
                  active={data.hasInjuries === true}
                  onClick={() => setData({ ...data, hasInjuries: true })}
                >
                  {t("onb.injuries.yes")}
                </BigButton>
              </div>
              {data.hasInjuries && (
                <textarea
                  value={data.injuryNotes ?? ""}
                  onChange={(e) => setData({ ...data, injuryNotes: e.target.value })}
                  placeholder={t("onb.injuries.placeholder")}
                  rows={3}
                  className="mt-3 w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-neon transition"
                />
              )}
            </div>
          )}

          {current === "preferredDays" && (
            <div>
              <label className="text-sm font-semibold">{t("onb.step.preferredDays")}</label>
              <p className="text-[11px] text-muted-foreground mt-1">{t("onb.hint.preferredDays")}</p>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {DAY_KEYS.map((dk, i) => {
                  const sel = data.preferredDays?.includes(i);
                  return (
                    <button
                      key={dk}
                      onClick={() => toggleDay(i)}
                      className={`h-14 rounded-xl text-[10px] uppercase tracking-wider font-black transition active:scale-95 ${
                        sel
                          ? "bg-neon text-primary-foreground"
                          : "bg-white/5 border border-white/10 text-foreground/70"
                      }`}
                    >
                      {t(`trimp.day.${dk}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {current === "summary" && (
            <FinishScreen goalLabelStr={goalLabel(goal, lang)} t={t} />
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
          {!isLast ? (
            <button
              onClick={() => canAdvance && setStep(step + 1)}
              disabled={!canAdvance}
              className="px-5 py-3 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              {t("onb.next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-5 py-3 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              {t("onb.seePlan")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ScaleStep({
  label,
  hint,
  lowKey,
  highKey,
  value,
  onChange,
  t,
}: {
  label: string;
  hint: string;
  lowKey: string;
  highKey: string;
  value: Scale1to5;
  onChange: (v: Scale1to5) => void;
  t: (k: string) => string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold">{label}</label>
      <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {([1, 2, 3, 4, 5] as Scale1to5[]).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`h-16 rounded-2xl font-display font-black text-xl tabular transition active:scale-95 ${
              value === n
                ? "bg-neon text-primary-foreground shadow-neon"
                : "bg-white/5 border border-white/10 text-foreground/70"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
        <span>{t(lowKey)}</span>
        <span>{t(highKey)}</span>
      </div>
    </div>
  );
}

function FinishScreen({ goalLabelStr, t }: { goalLabelStr: string; t: (k: string, vars?: Record<string, string | number>) => string }) {
  return (
    <div className="text-center py-2">
      <div className="mx-auto h-20 w-20 rounded-full bg-neon/15 grid place-items-center text-neon relative">
        <Sparkles className="h-9 w-9 relative z-10" />
        <span className="absolute inset-0 rounded-full bg-neon/30 animate-ping" />
        <span className="absolute inset-2 rounded-full bg-neon/20 animate-pulse" />
      </div>
      <h3 className="mt-5 font-display font-black text-xl tracking-tight">
        {t("onb.finish.title")}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground leading-snug">
        {t("onb.finish.body")}
      </p>
      <div className="mt-4 rounded-2xl border border-neon/30 bg-neon/5 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-black">
          {t("onb.finish.previewLabel")}
        </div>
        <div className="mt-1 text-sm font-bold text-foreground">
          {t("onb.finish.preview", { goal: goalLabelStr })}
        </div>
      </div>
    </div>
  );
}
