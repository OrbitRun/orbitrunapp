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
  "profile.audio.value.500": "Every 500 m",
  "profile.audio.value.1000": "Every 1 km",
  "profile.music": "Music source",
  "profile.music.value": "Spotify (soon)",
  "profile.haptic": "Haptic feedback",
  "profile.haptic.value": "On",
  "profile.haptic.value.on": "On",
  "profile.haptic.value.off": "Off",
  "profile.language": "Language",
  "profile.runner": "Runner",
  "profile.name": "Your name",
  "profile.namePlaceholder": "Enter your name",
  "profile.goal": "Primary goal",
  "profile.level": "Experience level",
  "profile.level.beginner": "Beginner",
  "profile.level.expert": "Expert",
  "profile.level.beginnerHint": "Simpler stats · more voice cues",
  "profile.level.expertHint": "Advanced metrics · fewer cues",
  "profile.memberCard": "Member Card",

  // Greeting
  "greet.ready": "Ready for your run, {name}?",
  "greet.goal": "Let's hit your goal: {goal}!",
  "greet.welcome": "Welcome, {name}",

  // Onboarding
  "onb.title": "Welcome to Orbit Lab",
  "onb.subtitle": "Let's personalize your experience",
  "onb.step.name": "What's your name?",
  "onb.step.goal": "What's your primary goal?",
  "onb.step.level": "What's your experience level?",
  "onb.next": "Next",
  "onb.back": "Back",
  "onb.finish": "Get started",
  "onb.skip": "Skip",

  // Voice with name
  "voice.kmDoneName": "Great work {name}! Kilometer {km} done.",
  "voice.halfway": "Halfway to your goal, {name}!",

  // Summary
  "summary.title": "Run complete",
  "summary.subtitle": "Review your session",
  "summary.save": "Save",
  "summary.discard": "Delete",
  "summary.discardConfirm": "Delete this run? This cannot be undone.",
  "summary.discardConfirmTitle": "Are you sure?",
  "summary.cancel": "Cancel",
  "summary.confirmDelete": "Yes, delete",
  "summary.finalConfirmTitle": "Final warning",
  "summary.finalConfirm": "This will permanently erase the run and all its data. There's no undo.",
  "summary.finalDelete": "Delete permanently",
  "summary.keep": "Keep run",

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

  // Shoes
  "shoes.title": "My shoes",
  "shoes.add": "Add",
  "shoes.empty": "No shoes yet. Add your first pair to track mileage.",
  "shoes.addTitle": "Add a shoe",
  "shoes.addHint": "Track mileage and get notified when it's time for a new pair.",
  "shoes.brand": "Brand",
  "shoes.model": "Model",
  "shoes.startKm": "Starting km",
  "shoes.maxKm": "Max km",
  "shoes.makePrimary": "Set as primary shoe",
  "shoes.save": "Save shoe",
  "shoes.primary": "Primary",
  "shoes.retired": "Retired",
  "shoes.setPrimary": "Set primary",
  "shoes.retire": "Retire",
  "shoes.reactivate": "Reactivate",
  "shoes.warn": "Time to consider new shoes",
  "shoes.deleteTitle": "Delete this shoe?",
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
  "profile.audio.value.500": "Hver 500 m",
  "profile.audio.value.1000": "Hver 1 km",
  "profile.music": "Musikkilde",
  "profile.music.value": "Spotify (snart)",
  "profile.haptic": "Haptisk feedback",
  "profile.haptic.value": "Til",
  "profile.haptic.value.on": "Til",
  "profile.haptic.value.off": "Fra",
  "profile.language": "Sprog",
  "profile.runner": "Løber",
  "profile.name": "Dit navn",
  "profile.namePlaceholder": "Indtast dit navn",
  "profile.goal": "Primært mål",
  "profile.level": "Erfaringsniveau",
  "profile.level.beginner": "Begynder",
  "profile.level.expert": "Ekspert",
  "profile.level.beginnerHint": "Simple stats · flere stemmesignaler",
  "profile.level.expertHint": "Avancerede mål · færre signaler",
  "profile.memberCard": "Medlemskort",

  "greet.ready": "Klar til din tur, {name}?",
  "greet.goal": "Lad os ramme dit mål om {goal}!",
  "greet.welcome": "Velkommen, {name}",

  "onb.title": "Velkommen til Orbit Lab",
  "onb.subtitle": "Lad os personalisere din oplevelse",
  "onb.step.name": "Hvad hedder du?",
  "onb.step.goal": "Hvad er dit primære mål?",
  "onb.step.level": "Hvad er dit erfaringsniveau?",
  "onb.next": "Næste",
  "onb.back": "Tilbage",
  "onb.finish": "Kom i gang",
  "onb.skip": "Spring over",

  "voice.kmDoneName": "Godt kæmpet {name}! Kilometer {km} fuldført.",
  "voice.halfway": "Du er halvvejs mod dit mål, {name}!",

  "summary.title": "Løb fuldført",
  "summary.subtitle": "Gennemse din session",
  "summary.save": "Gem",
  "summary.discard": "Slet",
  "summary.discardConfirm": "Slet dette løb? Dette kan ikke fortrydes.",
  "summary.discardConfirmTitle": "Er du sikker?",
  "summary.cancel": "Annullér",
  "summary.confirmDelete": "Ja, slet",
  "summary.finalConfirmTitle": "Sidste advarsel",
  "summary.finalConfirm": "Dette sletter løbeturen og al dens data permanent. Det kan ikke fortrydes.",
  "summary.finalDelete": "Slet permanent",
  "summary.keep": "Behold løbetur",

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

  // Shoes
  "shoes.title": "Mine sko",
  "shoes.add": "Tilføj",
  "shoes.empty": "Ingen sko endnu. Tilføj dit første par for at spore kilometer.",
  "shoes.addTitle": "Tilføj et par sko",
  "shoes.addHint": "Spor kilometer og få besked, når det er tid til nye sko.",
  "shoes.brand": "Mærke",
  "shoes.model": "Model",
  "shoes.startKm": "Start-km",
  "shoes.maxKm": "Maks-km",
  "shoes.makePrimary": "Sæt som primære sko",
  "shoes.save": "Gem sko",
  "shoes.primary": "Primær",
  "shoes.retired": "Pensioneret",
  "shoes.setPrimary": "Sæt primær",
  "shoes.retire": "Pensionér",
  "shoes.reactivate": "Genaktivér",
  "shoes.warn": "Tid til at overveje nye sko",
  "shoes.deleteTitle": "Slet disse sko?",
};

const dicts: Record<Lang, Dict> = { en, da };

type I18nCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<I18nCtx | null>(null);

function detectOSLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const candidates: string[] = [];
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
  if (navigator.language) candidates.push(navigator.language);
  for (const c of candidates) {
    if (typeof c === "string" && c.toLowerCase().startsWith("da")) return "da";
  }
  return "en";
}

function getSavedLang(): Lang | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "da") return saved;
  } catch {
    /* noop */
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = getSavedLang();
    setLangState(saved ?? detectOSLang());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLangChange = () => {
      // Only auto-update when user has not made a manual choice
      if (getSavedLang() === null) {
        setLangState(detectOSLang());
      }
    };
    window.addEventListener("languagechange", onLangChange);
    return () => window.removeEventListener("languagechange", onLangChange);
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
    const fallbackLang: Lang = typeof window === "undefined" ? "en" : (getSavedLang() ?? detectOSLang());
    return {
      lang: fallbackLang,
      setLang: () => {},
      t: (k: string, vars?: Record<string, string | number>) => {
        const dict = dicts[fallbackLang];
        let s = dict[k] ?? en[k] ?? k;
        if (vars) for (const [kk, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${kk}\\}`, "g"), String(v));
        return s;
      },
    };
  }
  return ctx;
}

export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  return getSavedLang() ?? detectOSLang();
}

export function paceToWords(secPerKm: number, lang: Lang): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  if (lang === "da") {
    return `${m} minutter og ${s} sekunder per kilometer`;
  }
  return `${m} minute${m === 1 ? "" : "s"} ${s} second${s === 1 ? "" : "s"} per kilometer`;
}
