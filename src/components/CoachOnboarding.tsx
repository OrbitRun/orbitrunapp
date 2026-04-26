import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  loadProfile,
  saveProfile,
  coachLevelLabel,
  coachFrequencyLabel,
  coachGoalLabel,
  coachToRunningGoal,
  type CoachLevel,
  type CoachFrequency,
  type CoachGoal,
  type FasterDistance,
} from "@/lib/user-profile";

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

type ResumeState = {
  step: number;
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
  fasterDistance: FasterDistance;
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
  const existing = loadProfile().coach;
  const resume = loadResume();
  const [step, setStep] = useState<number>(resume?.step ?? 0);
  const [level, setLevel] = useState<CoachLevel>(resume?.level ?? existing?.level ?? "3-5");
  const [frequency, setFrequency] = useState<CoachFrequency>(
    resume?.frequency ?? existing?.frequency ?? "3-4"
  );
  const [goal, setGoal] = useState<CoachGoal>(resume?.goal ?? existing?.goal ?? "finish5k");
  const [fasterDistance, setFasterDistance] = useState<FasterDistance>(
    resume?.fasterDistance ?? existing?.fasterDistance ?? "5k"
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        RESUME_KEY,
        JSON.stringify({ step, level, frequency, goal, fasterDistance } satisfies ResumeState)
      );
    } catch {
      /* noop */
    }
  }, [step, level, frequency, goal, fasterDistance]);

  // Dynamic flow: insert "fasterDistance" step after goal step when needed.
  const steps: Array<"level" | "frequency" | "goal" | "fasterDistance"> =
    goal === "runFaster"
      ? ["level", "frequency", "goal", "fasterDistance"]
      : ["level", "frequency", "goal"];
  const totalSteps = steps.length;
  const safeStep = Math.min(step, totalSteps - 1);
  const current = steps[safeStep];
  const isLast = safeStep === totalSteps - 1;

  const finish = () => {
    const p = loadProfile();
    // Reset baseline if any coach setting changed (so progress restarts).
    const changed =
      !p.coach ||
      p.coach.level !== level ||
      p.coach.frequency !== frequency ||
      p.coach.goal !== goal ||
      p.coach.fasterDistance !== (goal === "runFaster" ? fasterDistance : undefined);
    const nextCoach = {
      level,
      frequency,
      goal,
      fasterDistance: goal === "runFaster" ? fasterDistance : undefined,
      configuredAt: changed ? Date.now() : p.coach!.configuredAt,
    };
    saveProfile({
      ...p,
      coach: nextCoach,
      goal: coachToRunningGoal(nextCoach),
      coachEnabled: p.coachEnabled === false ? false : true,
    });
    clearResume();
    onClose();
  };

  const handleSkip = () => {
    clearResume();
    onClose();
  };

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

        <div className="mt-6 min-h-[220px]">
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
              onClick={() => setStep(safeStep + 1)}
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
              {t("coach.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
