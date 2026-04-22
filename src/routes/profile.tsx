import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, Headphones, Languages, Lock, MapPin, Mic, Pencil, Satellite, Sparkles, Volume2 } from "lucide-react";
import { sanitizeName } from "@/lib/sanitize";
import { loadRuns } from "@/lib/run-types";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  GOAL_IDS,
  loadProfile,
  saveProfile,
  defaultLayoutForLevel,
  getDisplayName,
  computeGoalProgress,
  type GoalId,
  type Level,
  type UserProfile,
} from "@/lib/user-profile";
import { saveLayout } from "@/lib/stat-metrics";
import { loadSettings, updateSettings, type AppSettings, type CueInterval } from "@/lib/settings";
import ShoeTracker from "@/components/ShoeTracker";
import PRCarousel from "@/components/PRCarousel";
import NeonToggle from "@/components/NeonToggle";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [stats, setStats] = useState({ count: 0, distance: 0, time: 0 });
  const [runsForGoal, setRunsForGoal] = useState<{ distanceM: number; startedAt: number }[]>([]);
  const { t, lang, setLang } = useI18n();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [goal, setGoal] = useState<GoalId>("complete5k");
  const [savedFlash, setSavedFlash] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const runs = loadRuns();
    setStats({
      count: runs.length,
      distance: runs.reduce((a, r) => a + r.distanceM, 0),
      time: runs.reduce((a, r) => a + r.durationMs, 0),
    });
    setRunsForGoal(runs);
    const p = loadProfile();
    if (p) {
      setName(p.name);
      setLevel(p.level);
      setGoal(p.goal);
    }
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (editingName) inputRef.current?.focus();
  }, [editingName]);

  const persist = (patch: Partial<UserProfile>) => {
    const next: UserProfile = {
      name: patch.name ?? name,
      level: patch.level ?? level,
      goal: patch.goal ?? goal,
      createdAt: loadProfile()?.createdAt ?? Date.now(),
    };
    saveProfile(next);
    if (patch.level && patch.level !== level) {
      saveLayout(defaultLayoutForLevel(patch.level));
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  const commitName = () => {
    setEditingName(false);
    persist({ name });
  };

  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "da", label: "Dansk" },
  ];

  const profileObj: UserProfile = { name, level, goal, createdAt: 0 };
  const displayName = getDisplayName(profileObj, lang);
  const initial = displayName.charAt(0).toUpperCase();
  const goalProgress = computeGoalProgress(profileObj, runsForGoal, lang);

  const setCueInterval = (v: CueInterval) => {
    const next = { ...settings, cueIntervalKm: v };
    setSettings(next);
    updateSettings({ cueIntervalKm: v });
  };

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-32">
      <header className="py-3 flex items-center justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {t("profile.eyebrow")}
          </div>
          <h1 className="font-display font-black text-3xl tracking-tight">{t("profile.title")}</h1>
        </div>
        {savedFlash && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon/15 text-neon text-[10px] font-bold uppercase tracking-[0.18em]">
            <Check className="h-3 w-3" /> {t("profile.saved")}
          </span>
        )}
      </header>

      {/* A. User Header — premium member card with inline-editable name */}
      <section className="relative overflow-hidden rounded-3xl p-5 border border-white/10 bg-gradient-to-br from-[oklch(0.18_0.02_180)] via-[oklch(0.12_0.02_180)] to-[oklch(0.08_0.01_200)] shadow-card mb-5">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-neon/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-2xl font-black text-background shadow-neon">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              Orbit · Member
            </div>
            {editingName ? (
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(sanitizeName(e.target.value))}
                onBlur={commitName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setName(loadProfile()?.name ?? "");
                    setEditingName(false);
                  }
                }}
                placeholder={t("profile.namePlaceholder")}
                maxLength={24}
                className="w-full bg-transparent border-b-2 border-neon outline-none py-0.5 font-display font-black text-2xl tracking-tight focus:shadow-[0_4px_20px_-4px_oklch(0.92_0.21_140/0.5)] transition"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="group w-full text-left flex items-center gap-2"
                aria-label={t("profile.tapToEdit")}
              >
                <span className="font-display font-black text-2xl truncate">{displayName}</span>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-neon transition" />
              </button>
            )}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {t(`level.${level}`)} · {t(`goal.${goal}`)}
            </div>
          </div>
        </div>
      </section>

      {/* B. Status & Settings — small discrete row */}
      <section className="mb-5 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Satellite className="h-3.5 w-3.5 text-neon" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">
            {t("status.gps.idle")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t("settings.autoPause")}
          </span>
          <NeonToggle
            checked={settings.autoPause}
            size="sm"
            ariaLabel={t("settings.autoPause")}
            onChange={(v) => {
              const next = { ...settings, autoPause: v };
              setSettings(next);
              updateSettings({ autoPause: v });
            }}
          />
        </div>
      </section>

      {/* C. Active Goal */}
      {goalProgress && (
        <section className="mb-5 glass-strong rounded-2xl px-4 py-3">
          <div className="flex items-baseline justify-between">
            <div className="font-display font-bold text-sm">{goalProgress.label}</div>
            <div className="text-xs text-muted-foreground tabular">{goalProgress.detail}</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-neon shadow-neon transition-all"
              style={{ width: `${Math.round(goalProgress.pct * 100)}%` }}
            />
          </div>
        </section>
      )}

      {/* D. Stats Row */}
      <section className="mb-5 grid grid-cols-3 gap-3 glass rounded-2xl p-4">
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("profile.runs")}
          </div>
          <div className="font-display font-black text-2xl text-neon tabular">{stats.count}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("profile.km")}
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDistance(stats.distance)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("profile.time")}
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDuration(stats.time)}
          </div>
        </div>
      </section>

      {/* E. Personal Bests carousel */}
      <div className="mb-5">
        <PRCarousel />
      </div>

      {/* F. Shoe tracker */}
      <div className="mb-5">
        <ShoeTracker />
      </div>


      {/* Level */}
      <section className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-2 px-1">
          {t("profile.level")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["beginner", "expert"] as Level[]).map((l) => (
            <button
              key={l}
              onClick={() => {
                setLevel(l);
                persist({ level: l });
              }}
              className={`text-left rounded-2xl p-3 transition active:scale-[0.98] ${
                level === l
                  ? "bg-neon/10 border-2 border-neon shadow-neon"
                  : "glass border-2 border-transparent"
              }`}
            >
              <div className="font-display font-black text-base">{t(`level.${l}`)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{t(`level.${l}.desc`)}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Goal */}
      <section className="mt-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold mb-2 px-1">
          {t("profile.goal")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_IDS.map((g) => (
            <button
              key={g}
              onClick={() => {
                setGoal(g);
                persist({ goal: g });
              }}
              className={`rounded-2xl p-3 text-left transition active:scale-[0.98] ${
                goal === g
                  ? "bg-neon/10 border-2 border-neon shadow-neon"
                  : "glass border-2 border-transparent"
              }`}
            >
              <div className="font-display font-bold text-sm leading-tight">{t(`goal.${g}`)}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Voice cue frequency */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Mic className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">{t("settings.cueInterval")}</div>
            <div className="text-[11px] text-muted-foreground">{t("settings.cueIntervalDesc")}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([0.5, 1] as CueInterval[]).map((v) => (
            <button
              key={v}
              onClick={() => setCueInterval(v)}
              className={`py-2.5 rounded-xl text-sm font-bold uppercase tracking-[0.18em] transition active:scale-95 ${
                settings.cueIntervalKm === v
                  ? "bg-neon text-primary-foreground shadow-neon"
                  : "bg-white/5 text-foreground/80 hover:bg-white/10"
              }`}
            >
              {v === 0.5 ? t("settings.cue.500m") : t("settings.cue.1km")}
            </button>
          ))}
        </div>
      </section>

      {/* Language selector */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Languages className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.language")}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {langs.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`py-2.5 rounded-xl text-sm font-bold uppercase tracking-[0.18em] transition active:scale-95 ${
                lang === l.code
                  ? "bg-neon text-primary-foreground shadow-neon"
                  : "bg-white/5 text-foreground/80 hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        {[
          { Icon: MapPin, label: t("profile.gps"), value: t("profile.gps.value") },
          { Icon: Volume2, label: t("profile.audio"), value: t("profile.audio.value") },
          { Icon: Headphones, label: t("profile.music"), value: t("profile.music.value") },
          { Icon: Bell, label: t("profile.haptic"), value: t("profile.haptic.value") },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{value}</div>
          </div>
        ))}
      </section>

      <Link
        to="/onboarding"
        className="mt-4 flex items-center justify-center gap-2 glass rounded-2xl py-3 text-xs font-bold uppercase tracking-[0.22em] text-neon active:scale-[0.98] transition"
      >
        <Sparkles className="h-4 w-4" />
        {t("onb.welcome")}
      </Link>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Orbit Lab · v1.0
      </p>
    </main>
  );
}
