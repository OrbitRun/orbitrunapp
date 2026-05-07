import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Sparkles, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  loadProfile,
  saveProfile,
  coachLevelLabel,
  coachFrequencyLabel,
  coachGoalLabel,
  coachToRunningGoal,
  WEEKLY_VOLUMES,
  EXPERIENCES,
  INJURY_STATUSES,
  WEEK_DAYS,
  type CoachLevel,
  type CoachFrequency,
  type CoachGoal,
  type FasterDistance,
  type WeeklyVolume,
  type Experience,
  type InjuryStatus,
  type WeekDay,
  type LifestyleScore,
} from "@/lib/user-profile";
import { defaultConfig, loadHrZones, saveHrZones } from "@/lib/hr-zones-config";

type Props = { onClose: () => void };

const LEVELS: CoachLevel[] = ["0-2", "3-5", "5-10", "10+"];
const FREQS: CoachFrequency[] = ["1-2", "3-4", "5+"];
const GOALS: CoachGoal[] = ["finish5k", "finish10k", "halfMarathon", "marathon", "runFaster", "weightLoss"];
const FASTER_DISTANCES: FasterDistance[] = ["5k", "10k", "halfMarathon", "marathon"];

function fasterDistanceLabel(d: FasterDistance, lang: "en" | "da"): string {
  const en: Record<FasterDistance, string> = {
    "5k": "5 km",
    "10k": "10 km",
    halfMarathon: "Half marathon",
    marathon: "Marathon",
  };
  const da: Record<FasterDistance, string> = {
    "5k": "5 km",
    "10k": "10 km",
    halfMarathon: "Halvmarathon",
    marathon: "Marathon",
  };
  return (lang === "da" ? da : en)[d];
}

const RESUME_KEY = "orbit:coach-onboarding-progress";

type StepKey =
  | "level"
  | "frequency"
  | "goal"
  | "fasterDistance"
  | "weeklyVolume"
  | "experience"
  | "lifestyle"
  | "injury"
  | "preferredDays"
  | "bio"
  | "vo2max";

type ResumeState = {
  step: number;
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
  fasterDistance: FasterDistance;
  weeklyVolume: WeeklyVolume;
  experience: Experience;
  sleepQuality: LifestyleScore;
  stressLevel: LifestyleScore;
  injuryStatus: InjuryStatus;
  preferredDays: WeekDay[];
  age: string;
  gender: "male" | "female" | "other";
  weightKg: string;
  heightCm: string;
  maxHrKnown: string;
  vo2maxKnown: string;
  preferKnownVo2max: boolean;
};

function loadResume(): Partial<ResumeState> | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? (JSON.parse(raw) as Partial<ResumeState>) : null;
  } catch {
    return null;
  }
}

function clearResume() {
  try {
    localStorage.removeItem(RESUME_KEY);
  } catch {
    /* noop */
  }
}

export default function CoachOnboarding({ onClose }: Props) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const existing = loadProfile().coach;
  const resume = loadResume();
  const [step, setStep] = useState<number>(resume?.step ?? 0);
  const [thinking, setThinking] = useState<"none" | "phaseA" | "phaseB">("none");
  const [level, setLevel] = useState<CoachLevel>(resume?.level ?? existing?.level ?? "3-5");
  const [frequency, setFrequency] = useState<CoachFrequency>(
    resume?.frequency ?? existing?.frequency ?? "3-4"
  );
  const [goal, setGoal] = useState<CoachGoal>(resume?.goal ?? existing?.goal ?? "finish5k");
  const [fasterDistance, setFasterDistance] = useState<FasterDistance>(
    resume?.fasterDistance ?? existing?.fasterDistance ?? "5k"
  );
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolume>(
    resume?.weeklyVolume ?? existing?.weeklyVolume ?? "0-10"
  );
  const [experience, setExperience] = useState<Experience>(
    resume?.experience ?? existing?.experience ?? "recreational"
  );
  const [sleepQuality, setSleepQuality] = useState<LifestyleScore>(
    resume?.sleepQuality ?? existing?.sleepQuality ?? 3
  );
  const [stressLevel, setStressLevel] = useState<LifestyleScore>(
    resume?.stressLevel ?? existing?.stressLevel ?? 3
  );
  const [injuryStatus, setInjuryStatus] = useState<InjuryStatus>(
    resume?.injuryStatus ?? existing?.injuryStatus ?? "none"
  );
  const [preferredDays, setPreferredDays] = useState<WeekDay[]>(
    resume?.preferredDays ?? existing?.preferredDays ?? ["mon", "wed", "fri"]
  );

  const profileExisting = loadProfile();
  const [age, setAge] = useState<string>(
    resume?.age ?? (profileExisting.coach?.age != null ? String(profileExisting.coach.age) : "")
  );
  const [gender, setGender] = useState<"male" | "female" | "other">(
    resume?.gender ?? profileExisting.coach?.gender ?? "other"
  );
  const [vo2maxKnown, setVo2maxKnown] = useState<string>(
    resume?.vo2maxKnown ??
      (profileExisting.coach?.vo2maxKnown != null
        ? String(profileExisting.coach.vo2maxKnown)
        : "")
  );
  const [preferKnownVo2max, setPreferKnownVo2max] = useState<boolean>(
    resume?.preferKnownVo2max ?? profileExisting.coach?.preferKnownVo2max ?? false
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        RESUME_KEY,
        JSON.stringify({
          step,
          level,
          frequency,
          goal,
          fasterDistance,
          weeklyVolume,
          experience,
          sleepQuality,
          stressLevel,
          injuryStatus,
          preferredDays,
          age,
          gender,
          vo2maxKnown,
          preferKnownVo2max,
        } satisfies ResumeState)
      );
    } catch {
      /* noop */
    }
  }, [
    step,
    level,
    frequency,
    goal,
    fasterDistance,
    weeklyVolume,
    experience,
    sleepQuality,
    stressLevel,
    injuryStatus,
    preferredDays,
    age,
    gender,
    vo2maxKnown,
    preferKnownVo2max,
  ]);

  const steps: StepKey[] =
    goal === "runFaster"
      ? [
          "level",
          "frequency",
          "goal",
          "fasterDistance",
          "weeklyVolume",
          "experience",
          "lifestyle",
          "injury",
          "preferredDays",
          "bio",
          "vo2max",
        ]
      : [
          "level",
          "frequency",
          "goal",
          "weeklyVolume",
          "experience",
          "lifestyle",
          "injury",
          "preferredDays",
          "bio",
          "vo2max",
        ];
  const totalSteps = steps.length;
  const safeStep = Math.min(step, totalSteps - 1);
  const current = steps[safeStep];
  const isLast = safeStep === totalSteps - 1;
  const ageNumLive = age.trim() ? parseInt(age, 10) : NaN;
  const ageValid = Number.isFinite(ageNumLive) && ageNumLive >= 10 && ageNumLive <= 99;
  const canAdvance =
    current === "preferredDays"
      ? preferredDays.length > 0
      : current === "bio"
        ? ageValid
        : true;

  const persist = () => {
    const p = loadProfile();
    const ageNum = age.trim() ? Math.max(10, Math.min(99, parseInt(age, 10))) : undefined;
    const vo2Num = vo2maxKnown.trim()
      ? Math.max(20, Math.min(90, parseFloat(vo2maxKnown.replace(",", "."))))
      : undefined;
    const changed =
      !p.coach ||
      p.coach.level !== level ||
      p.coach.frequency !== frequency ||
      p.coach.goal !== goal ||
      p.coach.fasterDistance !== (goal === "runFaster" ? fasterDistance : undefined) ||
      p.coach.weeklyVolume !== weeklyVolume ||
      p.coach.experience !== experience ||
      p.coach.sleepQuality !== sleepQuality ||
      p.coach.stressLevel !== stressLevel ||
      p.coach.injuryStatus !== injuryStatus ||
      JSON.stringify(p.coach.preferredDays ?? []) !== JSON.stringify(preferredDays);
    const nextCoach = {
      level,
      frequency,
      goal,
      fasterDistance: goal === "runFaster" ? fasterDistance : undefined,
      weeklyVolume,
      experience,
      sleepQuality,
      stressLevel,
      injuryStatus,
      preferredDays,
      age: ageNum && Number.isFinite(ageNum) ? ageNum : undefined,
      gender,
      vo2maxKnown: vo2Num && Number.isFinite(vo2Num) ? vo2Num : undefined,
      preferKnownVo2max: vo2Num != null ? preferKnownVo2max : false,
      configuredAt: changed || !p.coach ? Date.now() : p.coach.configuredAt,
    };
    saveProfile({
      ...p,
      coach: nextCoach,
      goal: coachToRunningGoal(nextCoach),
      coachEnabled: p.coachEnabled === false ? false : true,
    });
    // Recalibrate HR zones from new age (preserves existing restingHr if set).
    if (ageNum != null) {
      const existing = loadHrZones();
      const restingHr = existing?.restingHr ?? 60;
      saveHrZones(defaultConfig(ageNum, restingHr));
    }
    clearResume();
  };

  const enterThinking = () => {
    persist();
    setThinking("phaseA");
  };

  useEffect(() => {
    if (thinking !== "phaseA") return;
    const id = setTimeout(() => setThinking("phaseB"), 3000);
    return () => clearTimeout(id);
  }, [thinking]);

  const handleSkip = () => {
    clearResume();
    onClose();
  };

  const goToCoach = () => {
    onClose();
    navigate({ to: "/coach" });
  };

  // ===== Thinking screen =====
  if (thinking !== "none") {
    const goalText = coachGoalLabel(goal, lang, goal === "runFaster" ? fasterDistance : undefined);
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
        <div className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-card text-center">
          <div className="grid place-items-center my-6">
            <div
              className={`h-24 w-24 rounded-full bg-neon/15 grid place-items-center text-neon shadow-neon ${
                thinking === "phaseA" ? "animate-pulse" : ""
              }`}
              style={
                thinking === "phaseA"
                  ? { animationDuration: "1.2s" }
                  : undefined
              }
            >
              <Sparkles className="h-10 w-10" />
            </div>
          </div>
          {thinking === "phaseA" ? (
            <p className="text-sm font-semibold text-muted-foreground">
              {t("coach.thinking.analyzing")}
            </p>
          ) : (
            <>
              <p className="text-sm leading-snug">{t("coach.thinking.done")}</p>
              <div className="mt-4 rounded-2xl border border-neon/30 bg-neon/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-bold mb-1">
                  {t("coach.cardTitle")}
                </div>
                <p className="text-sm font-semibold leading-snug">
                  {t("coach.thinking.goalPreview", { goal: goalText })}
                </p>
              </div>
              <button
                onClick={goToCoach}
                className="mt-6 w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-neon text-primary-foreground text-sm font-black uppercase tracking-[0.15em] shadow-neon active:scale-[0.98] transition"
              >
                <Sparkles className="h-4 w-4" />
                {t("coach.thinking.cta")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 shadow-card">
        <div className="flex items-center gap-2 text-neon mb-1">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
            {t("coach.subtitle")}
          </span>
        </div>
        <h2 className="font-display font-black text-2xl tracking-tight">{t("coach.title")}</h2>

        <div className="mt-4 flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${i <= safeStep ? "bg-neon" : "bg-white/10"}`}
            />
          ))}
        </div>

        <div className="mt-6 min-h-[260px]">
          {current === "level" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.level")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {LEVELS.map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setLevel(lv)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                      level === lv
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachLevelLabel(lv, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "frequency" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.frequency")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {FREQS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                      frequency === f
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachFrequencyLabel(f, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "goal" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.goal")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`h-14 px-3 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 flex items-center justify-center text-center leading-tight ${
                      goal === g
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {coachGoalLabel(g, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "fasterDistance" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.fasterDistance")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {FASTER_DISTANCES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setFasterDistance(d)}
                    className={`h-14 px-3 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 flex items-center justify-center text-center leading-tight ${
                      fasterDistance === d
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {fasterDistanceLabel(d, lang)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "weeklyVolume" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.weeklyVolume")}</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {WEEKLY_VOLUMES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setWeeklyVolume(v)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                      weeklyVolume === v
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {t(`coach.opt.weeklyVolume.${v}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "experience" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.experience")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {EXPERIENCES.map((e) => (
                  <button
                    key={e}
                    onClick={() => setExperience(e)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                      experience === e
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {t(`coach.opt.experience.${e}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {current === "lifestyle" && (
            <div className="space-y-5">
              <label className="text-sm font-semibold block">{t("coach.q.lifestyle")}</label>
              <LifestyleScale
                label={t("coach.q.lifestyle.sleep")}
                lowLabel={t("coach.q.lifestyle.low")}
                highLabel={t("coach.q.lifestyle.high")}
                value={sleepQuality}
                onChange={setSleepQuality}
              />
              <LifestyleScale
                label={t("coach.q.lifestyle.stress")}
                lowLabel={t("coach.q.lifestyle.low")}
                highLabel={t("coach.q.lifestyle.high")}
                value={stressLevel}
                onChange={setStressLevel}
              />
            </div>
          )}

          {current === "injury" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.injury")}</label>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {INJURY_STATUSES.map((i) => (
                  <button
                    key={i}
                    onClick={() => setInjuryStatus(i)}
                    className={`h-14 rounded-2xl text-sm font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                      injuryStatus === i
                        ? "bg-neon text-primary-foreground"
                        : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    {t(`coach.opt.injury.${i}`)}
                  </button>
                ))}
              </div>
              {injuryStatus === "current" && (
                <div className="mt-3 flex gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-snug">{t("coach.injury.warning")}</p>
                </div>
              )}
            </div>
          )}

          {current === "preferredDays" && (
            <div>
              <label className="text-sm font-semibold">{t("coach.q.preferredDays")}</label>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {WEEK_DAYS.map((d) => {
                  const selected = preferredDays.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() =>
                        setPreferredDays((cur) =>
                          cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
                        )
                      }
                      className={`h-12 rounded-xl text-xs font-bold uppercase tracking-[0.1em] transition active:scale-95 ${
                        selected
                          ? "bg-neon text-primary-foreground"
                          : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                      }`}
                    >
                      {t(`coach.opt.day.${d}`)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {current === "bio" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block">{t("coach.q.bio")}</label>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  {t("coach.q.bio.help")}
                </p>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1.5">
                  {t("coach.q.gender")}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`h-12 rounded-xl text-xs font-bold uppercase tracking-[0.12em] transition active:scale-95 ${
                        gender === g
                          ? "bg-neon text-primary-foreground"
                          : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
                      }`}
                    >
                      {t(`coach.opt.gender.${g}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1.5">
                  {t("coach.q.age")}
                </div>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
                  placeholder="—"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-center text-base font-bold tabular focus:border-neon outline-none"
                />
              </div>
            </div>
          )}

          {current === "vo2max" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block">{t("coach.q.vo2max")}</label>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                  {t("coach.q.vo2max.help")}
                </p>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1.5">
                  {t("coach.q.vo2maxKnown")}
                </div>
                <input
                  inputMode="decimal"
                  value={vo2maxKnown}
                  onChange={(e) =>
                    setVo2maxKnown(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))
                  }
                  placeholder="—"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-center text-base font-bold tabular focus:border-neon outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => vo2maxKnown.trim() && setPreferKnownVo2max((v) => !v)}
                disabled={!vo2maxKnown.trim()}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition disabled:opacity-40 ${
                  preferKnownVo2max && vo2maxKnown.trim()
                    ? "border-neon/50 bg-neon/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold">{t("coach.q.preferKnown")}</div>
                  <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {t("coach.q.preferKnown.help")}
                  </div>
                </div>
                <div
                  className={`relative h-6 w-10 rounded-full transition flex-shrink-0 ${
                    preferKnownVo2max && vo2maxKnown.trim() ? "bg-neon" : "bg-white/15"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition ${
                      preferKnownVo2max && vo2maxKnown.trim() ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </div>
              </button>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {t("coach.q.vo2max.fallback")}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={safeStep === 0 ? handleSkip : () => setStep(safeStep - 1)}
            className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
          >
            {safeStep === 0 ? (
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
              onClick={() => canAdvance && setStep(safeStep + 1)}
              disabled={!canAdvance}
              className="px-5 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5 disabled:opacity-40 disabled:active:scale-100"
            >
              {t("onb.next")}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => canAdvance && enterThinking()}
              disabled={!canAdvance}
              className="px-5 py-2.5 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] shadow-neon active:scale-95 transition flex items-center gap-1.5 disabled:opacity-40 disabled:active:scale-100"
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

function LifestyleScale({
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: LifestyleScore;
  onChange: (v: LifestyleScore) => void;
}) {
  const values: LifestyleScore[] = [1, 2, 3, 4, 5];
  return (
    <div>
      <div className="text-xs font-semibold mb-2">{label}</div>
      <div className="grid grid-cols-5 gap-1.5">
        {values.map((v) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`h-11 rounded-xl text-sm font-black tabular transition active:scale-95 ${
              value === v
                ? "bg-neon text-primary-foreground"
                : "bg-white/5 border border-white/10 text-foreground/80 hover:bg-white/10"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
