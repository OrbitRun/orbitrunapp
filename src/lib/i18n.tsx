import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "en" | "da";

const STORAGE_KEY = "orbit:lang:v1";

type Dict = Record<string, string>;

const en: Dict = {
  // Header / status
  "app.brand": "Orbit Lab",
  "status.ready": "Ready to run",
  "status.running": "In motion",
  "status.paused": "Paused",
  "status.finished": "Run saved",

  // Stats
  "stat.distance": "Distance",
  "stat.duration": "Duration",
  "stat.pace": "Pace",
  "stat.cadence": "Cadence",
  "stat.elev": "Elev",
  "stat.elevation": "Elevation",
  "stat.avgPace": "Avg pace",
  "unit.km": "km",
  "unit.perKm": "/km",
  "unit.spm": "spm",
  "unit.m": "m",

  // Map
  "map.legend.slow": "slow",
  "map.legend.mid": "mid",
  "map.legend.fast": "fast",
  "map.placeholder": "Press start to begin tracking",

  // Splits
  "splits.title": "Splits",
  "splits.km": "KM",

  // Controls
  "ctrl.start": "Start",
  "ctrl.pause": "Pause",
  "ctrl.resume": "Resume",
  "ctrl.stop": "Finish run",

  // Hints
  "hint.autoSplits": "Auto splits",
  "hint.voice": "Voice cues",
  "hint.elevation": "Elevation",

  // Countdown
  "cd.getReady": "Get ready",
  "cd.startNow": "Start now",
  "cd.cancel": "Cancel",
  "cd.go": "Go!",

  // Music
  "music.demo": "demo",
  "music.spotifySoon": "Spotify integration coming soon",

  // Nav
  "nav.run": "Run",
  "nav.history": "History",
  "nav.profile": "Profile",

  // History
  "history.eyebrow": "Archive",
  "history.title": "Past runs",
  "history.runs": "Runs",
  "history.distance": "Distance",
  "history.time": "Time",
  "history.empty": "No runs yet. Hit the start button to log your first one.",
  "history.startCta": "Start a run",
  "history.deleteConfirm": "Delete this run?",
  "history.back": "Back",

  // Profile
  "profile.eyebrow": "Athlete",
  "profile.title": "Profile",
  "profile.member": "Member · since today",
  "profile.runs": "Runs",
  "profile.km": "KM",
  "profile.time": "Time",
  "profile.gps": "GPS accuracy",
  "profile.gps.value": "High",
  "profile.audio": "Audio cues",
  "profile.audio.value": "Every 1 km",
  "profile.music": "Music source",
  "profile.music.value": "Spotify (soon)",
  "profile.haptic": "Haptic feedback",
  "profile.haptic.value": "On",
  "profile.language": "Language",
  "profile.runner": "Runner",

  // Summary
  "summary.title": "Run complete",
  "summary.subtitle": "Review your session",
  "summary.save": "Save run",
  "summary.discard": "Delete run",
  "summary.discardConfirm": "Delete this run? This cannot be undone.",
  "summary.discardConfirmTitle": "Are you sure?",
  "summary.cancel": "Cancel",
  "summary.confirmDelete": "Yes, delete",

  "edit.pickMetric": "Choose metric",
  "edit.pickHint": "Tap a stat to assign it to this slot.",
  "edit.exit": "Done",
  "edit.hint": "Long-press any tile to customize",

  // Voice cues
  "voice.kmDone": "Kilometer {km} completed.",
  "voice.splitPace": "Split pace {pace}.",
  "voice.totalDist": "Total distance {km} kilometers.",
  "voice.runFinished": "Run finished. Distance {km} kilometers. Average pace {pace}.",
  "voice.paceUnit": "minutes per kilometer",
  "voice.minutes": "minutes",
  "voice.seconds": "seconds",
  "voice.perKm": "per kilometer",

  // Onboarding
  "onb.welcome": "Welcome to Orbit Lab",
  "onb.subtitle": "Let's set up your profile",
  "onb.step": "Step {n} of 3",
  "onb.next": "Next",
  "onb.back": "Back",
  "onb.finish": "Start running",
  "onb.namePrompt": "What should we call you?",
  "onb.nameHint": "We'll use this in voice cues and the dashboard.",
  "onb.namePlaceholder": "Your name",
  "onb.levelPrompt": "Pick your experience level",
  "onb.levelHint": "This sets your default tiles and how often the coach speaks.",
  "onb.goalPrompt": "What's your primary goal?",
  "onb.goalHint": "We'll personalize your dashboard around it.",
  "onb.skip": "Skip",

  // Levels
  "level.beginner": "Beginner",
  "level.beginner.desc": "Simple tiles · cues every 1 km",
  "level.expert": "Expert",
  "level.expert.desc": "More metrics · cues every 0.5 km",

  // Goals
  "goal.complete5k": "Finish 5 km",
  "goal.faster": "Run faster",
  "goal.weightloss": "Weight loss",
  "goal.marathon": "Marathon training",

  // Personalized greeting / coach
  "greet.ready": "Ready for your run, {name}?",
  "greet.goal": "Let's hit your goal: {goal}",
  "greet.weekly": "Keep the streak going, {name}",
  "coach.halfway": "Nice work, {name}! You're halfway to your goal.",
  "coach.runStart": "Let's go {name}!",
  "progress.title": "Goal progress",
  "profile.name": "Name",
  "profile.level": "Level",
  "profile.goal": "Goal",
  "profile.namePlaceholder": "Your name",
  "profile.save": "Save",
  "profile.saved": "Saved",
  "profile.tapToEdit": "Tap to edit",

  // Shoes
  "shoes.title": "My shoes",
  "shoes.add": "Add",
  "shoes.brand": "Brand",
  "shoes.model": "Model",
  "shoes.maxKm": "Max distance (km)",
  "shoes.save": "Save",
  "shoes.empty": "No shoes yet. Add a pair to track lifetime distance.",
  "shoes.setActive": "Set active",
  "shoes.remove": "Remove",

  // Personal bests
  "pr.title": "Personal bests",
  "pr.best": "Best time",
  "pr.5k": "5 km",
  "pr.10k": "10 km",
  "pr.half": "Half marathon",
  "pr.full": "Marathon",

  // Auto-pause
  "settings.autoPause": "Auto-pause",
  "settings.autoPauseDesc": "Pause when you stop moving",
  "settings.on": "On",
  "settings.off": "Off",

  // Voice cue interval
  "settings.cueInterval": "Voice cue frequency",
  "settings.cueIntervalDesc": "How often the coach speaks during a run",
  "settings.cue.500m": "Every 500 m",
  "settings.cue.1km": "Every 1 km",

  // Status row (live dashboard)
  "status.telemetry": "Telemetry",
  "status.live": "Live",
  "status.gps": "GPS",
  "status.gps.live": "Locked",
  "status.gps.idle": "Searching",
  "status.music": "Music",
  "status.music.value": "Spotify",
  "status.voice": "Voice",
  "status.voice.500m": "500 m",
  "status.voice.1km": "1 km",
  "status.haptic": "Haptics",
  "settings.haptic": "Haptic feedback",
  "settings.ignoreGpsSpikes": "Ignore GPS spikes",
};

const da: Dict = {
  "app.brand": "Orbit Lab",
  "status.ready": "Klar til løb",
  "status.running": "I bevægelse",
  "status.paused": "Pause",
  "status.finished": "Løb gemt",

  "stat.distance": "Distance",
  "stat.duration": "Varighed",
  "stat.pace": "Tempo",
  "stat.cadence": "Kadence",
  "stat.elev": "Stign.",
  "stat.elevation": "Stigning",
  "stat.avgPace": "Snit-tempo",
  "unit.km": "km",
  "unit.perKm": "/km",
  "unit.spm": "spm",
  "unit.m": "m",

  "map.legend.slow": "lav",
  "map.legend.mid": "mid",
  "map.legend.fast": "høj",
  "map.placeholder": "Tryk start for at begynde sporing",

  "splits.title": "Splits",
  "splits.km": "KM",

  "ctrl.start": "Start",
  "ctrl.pause": "Pause",
  "ctrl.resume": "Fortsæt",
  "ctrl.stop": "Afslut løb",

  "hint.autoSplits": "Auto splits",
  "hint.voice": "Stemmesignaler",
  "hint.elevation": "Stigning",

  "cd.getReady": "Gør dig klar",
  "cd.startNow": "Start nu",
  "cd.cancel": "Annullér",
  "cd.go": "Løb!",

  "music.demo": "demo",
  "music.spotifySoon": "Spotify-integration kommer snart",

  "nav.run": "Løb",
  "nav.history": "Historik",
  "nav.profile": "Profil",

  "history.eyebrow": "Arkiv",
  "history.title": "Tidligere løb",
  "history.runs": "Løb",
  "history.distance": "Distance",
  "history.time": "Tid",
  "history.empty": "Ingen løb endnu. Tryk på start for at logge dit første.",
  "history.startCta": "Start et løb",
  "history.deleteConfirm": "Slet dette løb?",
  "history.back": "Tilbage",

  "profile.eyebrow": "Atlet",
  "profile.title": "Profil",
  "profile.member": "Medlem · siden i dag",
  "profile.runs": "Løb",
  "profile.km": "KM",
  "profile.time": "Tid",
  "profile.gps": "GPS-nøjagtighed",
  "profile.gps.value": "Høj",
  "profile.audio": "Stemmesignaler",
  "profile.audio.value": "Hver 1 km",
  "profile.music": "Musikkilde",
  "profile.music.value": "Spotify (snart)",
  "profile.haptic": "Haptisk feedback",
  "profile.haptic.value": "Til",
  "profile.language": "Sprog",
  "profile.runner": "Løber",

  "summary.title": "Løb fuldført",
  "summary.subtitle": "Gennemse din session",
  "summary.save": "Gem løbetur",
  "summary.discard": "Slet løbetur",
  "summary.discardConfirm": "Slet dette løb? Dette kan ikke fortrydes.",
  "summary.discardConfirmTitle": "Er du sikker?",
  "summary.cancel": "Annullér",
  "summary.confirmDelete": "Ja, slet",

  "edit.pickMetric": "Vælg måling",
  "edit.pickHint": "Tryk på en måling for at tildele den til feltet.",
  "edit.exit": "Færdig",
  "edit.hint": "Hold på et felt for at tilpasse",

  "voice.kmDone": "Kilometer {km} fuldført.",
  "voice.splitPace": "Split-tempo {pace}.",
  "voice.totalDist": "Samlet distance {km} kilometer.",
  "voice.runFinished": "Løb afsluttet. Distance {km} kilometer. Gennemsnitstempo {pace}.",
  "voice.paceUnit": "minutter per kilometer",
  "voice.minutes": "minutter",
  "voice.seconds": "sekunder",
  "voice.perKm": "per kilometer",

  "onb.welcome": "Velkommen til Orbit Lab",
  "onb.subtitle": "Lad os sætte din profil op",
  "onb.step": "Trin {n} af 3",
  "onb.next": "Næste",
  "onb.back": "Tilbage",
  "onb.finish": "Start løbet",
  "onb.namePrompt": "Hvad skal vi kalde dig?",
  "onb.nameHint": "Vi bruger det i stemmesignaler og på forsiden.",
  "onb.namePlaceholder": "Dit navn",
  "onb.levelPrompt": "Vælg dit niveau",
  "onb.levelHint": "Dette styrer dine standard-felter og hvor ofte coachen taler.",
  "onb.goalPrompt": "Hvad er dit primære mål?",
  "onb.goalHint": "Vi tilpasser dit dashboard derefter.",
  "onb.skip": "Spring over",

  "level.beginner": "Begynder",
  "level.beginner.desc": "Enkle felter · signaler hver 1 km",
  "level.expert": "Ekspert",
  "level.expert.desc": "Flere målinger · signaler hver 0,5 km",

  "goal.complete5k": "Gennemfør 5 km",
  "goal.faster": "Løb hurtigere",
  "goal.weightloss": "Vægttab",
  "goal.marathon": "Marathontræning",

  "greet.ready": "Klar til din tur, {name}?",
  "greet.goal": "Lad os ramme dit mål: {goal}",
  "greet.weekly": "Hold momentum, {name}",
  "coach.halfway": "Godt kæmpet, {name}! Du er halvvejs mod dit mål.",
  "coach.runStart": "Kom så {name}!",
  "progress.title": "Mål-fremgang",
  "profile.name": "Navn",
  "profile.level": "Niveau",
  "profile.goal": "Mål",
  "profile.namePlaceholder": "Dit navn",
  "profile.save": "Gem",
  "profile.saved": "Gemt",
  "profile.tapToEdit": "Tryk for at redigere",

  "shoes.title": "Mine sko",
  "shoes.add": "Tilføj",
  "shoes.brand": "Mærke",
  "shoes.model": "Model",
  "shoes.maxKm": "Maks distance (km)",
  "shoes.save": "Gem",
  "shoes.empty": "Ingen sko endnu. Tilføj et par for at spore distance.",
  "shoes.setActive": "Vælg aktiv",
  "shoes.remove": "Fjern",

  "pr.title": "Personlige rekorder",
  "pr.best": "Bedste tid",
  "pr.5k": "5 km",
  "pr.10k": "10 km",
  "pr.half": "Halvmarathon",
  "pr.full": "Marathon",

  "settings.autoPause": "Auto-pause",
  "settings.autoPauseDesc": "Pauser automatisk når du stopper",
  "settings.on": "Til",
  "settings.off": "Fra",

  "settings.cueInterval": "Stemmesignal-frekvens",
  "settings.cueIntervalDesc": "Hvor ofte coachen taler under løbet",
  "settings.cue.500m": "Hver 500 m",
  "settings.cue.1km": "Hver 1 km",

  "status.telemetry": "Telemetri",
  "status.live": "Live",
  "status.gps": "GPS",
  "status.gps.live": "Låst",
  "status.gps.idle": "Søger",
  "status.music": "Musik",
  "status.music.value": "Spotify",
  "status.voice": "Stemme",
  "status.voice.500m": "500 m",
  "status.voice.1km": "1 km",
  "status.haptic": "Haptik",
  "settings.haptic": "Haptisk feedback",
};

const dicts: Record<Lang, Dict> = { en, da };

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "da") {
        setLangState(saved);
      } else {
        const nav = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
        if (nav.startsWith("da")) setLangState("da");
      }
    } catch {
      /* noop */
    }
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = dicts[lang];
      let s = dict[key] ?? en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return s;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback so SSR / non-wrapped trees don't crash
    return {
      lang: "en" as Lang,
      setLang: () => {},
      t: (k: string, vars?: Record<string, string | number>) => {
        let s = en[k] ?? k;
        if (vars) for (const [kk, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${kk}\\}`, "g"), String(v));
        return s;
      },
    };
  }
  return ctx;
}

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "da") return saved;
  } catch {
    /* noop */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase();
  return nav.startsWith("da") ? "da" : "en";
}

export function paceToWords(secPerKm: number, lang: Lang): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (lang === "da") {
    return `${m} minutter og ${s} sekunder per kilometer`;
  }
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} per kilometer`;
}
