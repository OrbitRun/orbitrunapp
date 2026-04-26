// User profile: name, goal, experience level. Persisted in localStorage.

export type ExperienceLevel = "beginner" | "expert";
export type RunningGoal = "run5k" | "run10k" | "runFaster" | "weightLoss" | "halfMarathon" | "marathon";
export type AudioCueMeters = 500 | 1000;
export type WindUnit = "ms" | "kmh";

export type CoachLevel = "0-2" | "3-5" | "5-10" | "10+";
export type CoachFrequency = "1-2" | "3-4" | "5+";
export type CoachGoal = "weightLoss" | "finish5k" | "faster10k" | "halfMarathon" | "marathon";

export type CoachConfig = {
  level: CoachLevel;
  frequency: CoachFrequency;
  goal: CoachGoal;
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
