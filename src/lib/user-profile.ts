// User profile: name, goal, experience level. Persisted in localStorage.

export type ExperienceLevel = "beginner" | "expert";
export type RunningGoal = "run5k" | "run10k" | "runFaster" | "weightLoss" | "halfMarathon" | "marathon";
export type AudioCueMeters = 500 | 1000;
export type WindUnit = "ms" | "kmh";
export type CountdownSeconds = 0 | 3 | 5 | 10 | 15 | 20 | 30 | 45 | 60;
export const COUNTDOWN_OPTIONS: CountdownSeconds[] = [0, 3, 5, 10, 15, 20, 30, 45, 60];

export type CoachLevel = "0-2" | "3-5" | "5-10" | "10+";
export type CoachFrequency = "1-2" | "3-4" | "5+";
export type CoachGoal = "weightLoss" | "finish5k" | "finish10k" | "halfMarathon" | "marathon" | "runFaster";
export type FasterDistance = "5k" | "10k" | "halfMarathon" | "marathon";

export type CoachConfig = {
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
  fasterDistance?: FasterDistance;
  configuredAt: number;
};

export type UserProfile = {
  name: string;
  goal: RunningGoal;
  level: ExperienceLevel;
  audioCueMeters: AudioCueMeters;
  hapticEnabled: boolean;
  prVoiceEnabled: boolean;
  windUnit: WindUnit;
  onboarded: boolean;
  coach?: CoachConfig;
  coachEnabled?: boolean;
  // Default ON. Pause tracking automatically when the runner stops moving.
  autoPauseEnabled?: boolean;
  // Default ON. Continuously snapshot the active run to localStorage so a
  // crash, refresh, or connectivity drop never loses the data.
  flightRecorderEnabled?: boolean;
  countdownSeconds?: CountdownSeconds;
};

const STORAGE_KEY = "orbit:user-profile:v1";

export const DEFAULT_PROFILE: UserProfile = {
  name: "",
  goal: "run5k",
  level: "beginner",
  audioCueMeters: 500,
  hapticEnabled: true,
  prVoiceEnabled: true,
  windUnit: "ms",
  onboarded: false,
  autoPauseEnabled: true,
  flightRecorderEnabled: true,
  countdownSeconds: 10,
};

export function loadProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(p: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("orbit:profile-update"));
  } catch {
    /* noop */
  }
}

export function displayName(p: UserProfile, lang: "en" | "da"): string {
  const n = p.name?.trim();
  if (n) return n;
  return lang === "da" ? "Løber" : "Runner";
}

export function goalLabel(goal: RunningGoal, lang: "en" | "da"): string {
  const en: Record<RunningGoal, string> = {
    run5k: "Run 5K",
    run10k: "Run 10K",
    runFaster: "Run faster",
    weightLoss: "Weight loss",
    halfMarathon: "Half marathon",
    marathon: "Marathon",
  };
  const da: Record<RunningGoal, string> = {
    run5k: "Løb 5km",
    run10k: "Løb 10km",
    runFaster: "Løb hurtigere",
    weightLoss: "Vægttab",
    halfMarathon: "Halvmarathon",
    marathon: "Marathon",
  };
  return (lang === "da" ? da : en)[goal];
}

export function coachLevelLabel(l: CoachLevel, lang: "en" | "da"): string {
  const en: Record<CoachLevel, string> = { "0-2": "0–2 km", "3-5": "3–5 km", "5-10": "5–10 km", "10+": "10+ km" };
  return en[l]; // distances are language-neutral
}

export function coachFrequencyLabel(f: CoachFrequency, lang: "en" | "da"): string {
  const en: Record<CoachFrequency, string> = { "1-2": "1–2 days", "3-4": "3–4 days", "5+": "5+ days" };
  const da: Record<CoachFrequency, string> = { "1-2": "1–2 dage", "3-4": "3–4 dage", "5+": "5+ dage" };
  return (lang === "da" ? da : en)[f];
}

export function coachToRunningGoal(c: CoachConfig): RunningGoal {
  switch (c.goal) {
    case "finish5k":
      return "run5k";
    case "finish10k":
      return "run10k";
    case "halfMarathon":
      return "halfMarathon";
    case "marathon":
      return "marathon";
    case "weightLoss":
      return "weightLoss";
    case "runFaster":
      switch (c.fasterDistance) {
        case "5k":
          return "run5k";
        case "10k":
          return "run10k";
        case "halfMarathon":
          return "halfMarathon";
        case "marathon":
          return "marathon";
        default:
          return "runFaster";
      }
  }
}

export function coachGoalLabel(
  g: CoachGoal,
  lang: "en" | "da",
  fasterDistance?: FasterDistance,
): string {
  const en: Record<CoachGoal, string> = {
    weightLoss: "Weight loss",
    finish5k: "Finish 5 km",
    finish10k: "Finish 10 km",
    halfMarathon: "Half marathon",
    marathon: "Marathon",
    runFaster: "Run faster",
  };
  const da: Record<CoachGoal, string> = {
    weightLoss: "Vægttab",
    finish5k: "Gennemfør 5 km",
    finish10k: "Gennemfør 10 km",
    halfMarathon: "Halvmarathon",
    marathon: "Marathon",
    runFaster: "Løb hurtigere",
  };
  if (g === "runFaster" && fasterDistance) {
    const distEn: Record<FasterDistance, string> = {
      "5k": "5 km",
      "10k": "10 km",
      halfMarathon: "half marathon",
      marathon: "marathon",
    };
    const distDa: Record<FasterDistance, string> = {
      "5k": "5 km",
      "10k": "10 km",
      halfMarathon: "halvmarathon",
      marathon: "marathon",
    };
    return lang === "da"
      ? `Hurtigere ${distDa[fasterDistance]}`
      : `Faster ${distEn[fasterDistance]}`;
  }
  return (lang === "da" ? da : en)[g];
}

// Deterministic "next task" suggestion based on coach answers.
export function nextCoachTask(p: UserProfile, lang: "en" | "da"): string {
  const c = p.coach;
  if (!c) return lang === "da" ? "Konfigurer din coach for at få en plan." : "Configure your coach to get a plan.";

  const da = lang === "da";
  const easy = (km: number) => (da ? `${km} km roligt løb` : `${km} km easy run`);
  const long = (km: number) => (da ? `${km} km langt løb` : `${km} km long run`);
  const tempo = (km: number) => (da ? `${km} km tempoløb` : `${km} km tempo run`);
  const intervals = (n: number, m: number) => (da ? `Intervaller: ${n}×${m}m` : `Intervals: ${n}×${m}m`);
  const walkRun = (min: number) => (da ? `Gå/løb i ${min} min` : `Walk/run for ${min} min`);

  // Pick base distance from level.
  const base = c.level === "0-2" ? 2 : c.level === "3-5" ? 4 : c.level === "5-10" ? 7 : 12;
  const longK = Math.max(base + 2, Math.round(base * 1.4));

  // Choose workout type by goal.
  switch (c.goal) {
    case "weightLoss":
      return c.frequency === "1-2" ? walkRun(30) : easy(base);
    case "finish5k":
      if (c.level === "0-2") return walkRun(25);
      return c.frequency === "5+" ? intervals(5, 400) : easy(base);
    case "finish10k":
      if (c.level === "0-2") return walkRun(30);
      return c.frequency === "5+" ? intervals(5, 600) : easy(Math.max(6, base));
    case "runFaster":
      switch (c.fasterDistance) {
        case "5k":
          return intervals(6, 400);
        case "10k":
          return intervals(5, 800);
        case "halfMarathon":
          return tempo(Math.max(6, base));
        case "marathon":
          return tempo(10);
        default:
          return tempo(Math.max(3, base - 1));
      }
    case "halfMarathon":
      return long(longK);
    case "marathon":
      return long(Math.max(longK, 14));
  }
}

export type CoachSessionType = "easy" | "long" | "tempo" | "intervals" | "walkRun" | "setup";

export type CoachSession = {
  type: CoachSessionType;
  title: string;
  summary: string;
  descriptionKey: string;
};

export function nextCoachSession(p: UserProfile, lang: "en" | "da"): CoachSession {
  const da = lang === "da";
  const c = p.coach;
  if (!c) {
    return {
      type: "setup",
      title: da ? "Konfigurer din coach" : "Configure your coach",
      summary: da ? "Få et tilpasset pas hver dag" : "Get a tailored session each day",
      descriptionKey: "coach.cta.unset",
    };
  }

  const base = c.level === "0-2" ? 2 : c.level === "3-5" ? 4 : c.level === "5-10" ? 7 : 12;
  const longK = Math.max(base + 2, Math.round(base * 1.4));

  const easy = (km: number): CoachSession => ({
    type: "easy",
    title: da ? `${km} km roligt løb` : `${km} km easy run`,
    summary: da ? "Aerob base · samtaletempo" : "Aerobic base · conversational pace",
    descriptionKey: "coach.desc.easy",
  });
  const long = (km: number): CoachSession => ({
    type: "long",
    title: da ? `${km} km langt løb` : `${km} km long run`,
    summary: da ? "Udholdenhed · komfortabelt tempo" : "Endurance · comfortable pace",
    descriptionKey: "coach.desc.long",
  });
  const tempo = (km: number): CoachSession => ({
    type: "tempo",
    title: da ? `${km} km tempoløb` : `${km} km tempo run`,
    summary: da ? "Tærskel · behageligt hårdt" : "Threshold · comfortably hard",
    descriptionKey: "coach.desc.tempo",
  });
  const intervals = (n: number, m: number): CoachSession => ({
    type: "intervals",
    title: da ? `Intervaller: ${n}×${m}m` : `Intervals: ${n}×${m}m`,
    summary: da ? "Fart · hård men jævn" : "Speed · hard but even",
    descriptionKey: "coach.desc.intervals",
  });
  const walkRun = (min: number): CoachSession => ({
    type: "walkRun",
    title: da ? `Gå/løb i ${min} min` : `Walk/run for ${min} min`,
    summary: da ? "Vaneopbygning · lav belastning" : "Habit building · low impact",
    descriptionKey: "coach.desc.walkRun",
  });

  switch (c.goal) {
    case "weightLoss":
      return c.frequency === "1-2" ? walkRun(30) : easy(base);
    case "finish5k":
      if (c.level === "0-2") return walkRun(25);
      return c.frequency === "5+" ? intervals(5, 400) : easy(base);
    case "finish10k":
      if (c.level === "0-2") return walkRun(30);
      return c.frequency === "5+" ? intervals(5, 600) : easy(Math.max(6, base));
    case "runFaster":
      switch (c.fasterDistance) {
        case "5k":
          return intervals(6, 400);
        case "10k":
          return intervals(5, 800);
        case "halfMarathon":
          return tempo(Math.max(6, base));
        case "marathon":
          return tempo(10);
        default:
          return tempo(Math.max(3, base - 1));
      }
    case "halfMarathon":
      return long(longK);
    case "marathon":
      return long(Math.max(longK, 14));
  }
}
