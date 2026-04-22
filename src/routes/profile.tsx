import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Check, Headphones, Languages, Lock, MapPin, Mic, Music2, Pause, Pencil, Satellite, Sparkles, Volume2 } from "lucide-react";
import { beginAuth, isAuthed, isConfigured as isSpotifyConfigured, logout as spotifyLogout } from "@/lib/spotify";
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
  const [spotifyConnected, setSpotifyConnected] = useState(false);
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
    setSpotifyConnected(isAuthed());
  }, []);

  // Re-check Spotify connection when the tab regains focus, so the status
  // pill updates immediately after returning from the OAuth callback.
  useEffect(() => {
    const recheck = () => setSpotifyConnected(isAuthed());
    window.addEventListener("focus", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      window.removeEventListener("focus", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
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
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-32">
      <header className="py-2 flex items-center justify-between mb-3">
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

      {/* PR Carousel — top placement to showcase records first */}
      <div className="mb-3">
        <PRCarousel />
      </div>

      {/* User card with inline-editable name + integrated stats */}
      <section className="relative overflow-hidden rounded-3xl p-4 border border-white/10 bg-gradient-to-br from-[oklch(0.18_0.02_180)] via-[oklch(0.12_0.02_180)] to-[oklch(0.08_0.01_200)] shadow-card mb-3">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-neon/15 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-2xl font-black text-background shadow-neon shrink-0">
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
                className="w-full bg-transparent appearance-none rounded-none border-0 border-b-2 border-neon outline-none py-0 font-display font-black text-2xl tracking-tight"
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

        {/* Integrated stats row */}
        <div className="relative mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t("profile.runs")}
            </div>
            <div className="font-display font-black text-xl text-neon tabular">{stats.count}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t("profile.km")}
            </div>
            <div className="font-display font-black text-xl tabular">
              {formatDistance(stats.distance)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
              {t("profile.time")}
            </div>
            <div className="font-display font-black text-xl tabular">
              {formatDuration(stats.time)}
            </div>
          </div>
        </div>
      </section>

      {/* Unified telemetry & quick-settings grid */}
      <section className="mb-3 grid grid-cols-2 gap-2">
        {/* GPS status */}
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-neon/15 grid place-items-center text-neon">
            <Satellite className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {t("status.gps")}
            </div>
            <div className="text-[11px] font-bold truncate">{t("status.gps.idle")}</div>
          </div>
        </div>

        {/* Auto-Pause */}
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center ${settings.autoPause ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
            <Pause className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {t("settings.autoPause")}
            </div>
            <div className="text-[11px] font-bold truncate">
              {settings.autoPause ? t("settings.on") : t("settings.off")}
            </div>
          </div>
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

        {/* Voice cue frequency (cycles between 500 m / 1 km) */}
        <button
          onClick={() => setCueInterval(settings.cueIntervalKm === 1 ? 0.5 : 1)}
          className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-left active:scale-[0.98] transition"
          aria-label={t("settings.cueInterval")}
        >
          <div className="h-7 w-7 shrink-0 rounded-lg bg-neon/15 grid place-items-center text-neon">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {t("status.voice")}
            </div>
            <div className="text-[11px] font-bold truncate tabular">
              {settings.cueIntervalKm === 0.5 ? t("status.voice.500m") : t("status.voice.1km")}
            </div>
          </div>
        </button>

        {/* Haptic feedback */}
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center ${settings.haptic ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {t("status.haptic")}
            </div>
            <div className="text-[11px] font-bold truncate">
              {settings.haptic ? t("settings.on") : t("settings.off")}
            </div>
          </div>
          <NeonToggle
            checked={settings.haptic}
            size="sm"
            ariaLabel={t("settings.haptic")}
            onChange={(v) => {
              const next = { ...settings, haptic: v };
              setSettings(next);
              updateSettings({ haptic: v });
            }}
          />
        </div>

        {/* Ignore GPS speed spikes */}
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center ${settings.ignoreGpsSpeedSpikes ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
            <Satellite className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
              {t("settings.ignoreGpsSpikes")}
            </div>
            <div className="text-[11px] font-bold truncate">
              {settings.ignoreGpsSpeedSpikes ? t("settings.on") : t("settings.off")}
            </div>
          </div>
          <NeonToggle
            checked={settings.ignoreGpsSpeedSpikes}
            size="sm"
            ariaLabel={t("settings.ignoreGpsSpikes")}
            onChange={(v) => {
              const next = { ...settings, ignoreGpsSpeedSpikes: v };
              setSettings(next);
              updateSettings({ ignoreGpsSpeedSpikes: v });
            }}
          />
        </div>
      </section>

      {/* Active Goal */}
      {goalProgress && (
        <section className="mb-3 glass-strong rounded-2xl px-4 py-2.5">
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

      {/* Shoe tracker */}
      <div className="mb-3">
        <ShoeTracker />
      </div>

      {/* Spotify connect */}
      <section className="mb-5 glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-background shrink-0">
            <Music2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Spotify</div>
            <div className="text-[11px] text-muted-foreground">
              {spotifyConnected
                ? (lang === "da" ? "Forbundet — styr afspilning under løb" : "Connected — control playback during runs")
                : (lang === "da" ? "Forbind for at styre musik fra dit løb" : "Connect to control music during runs")}
            </div>
          </div>
          {spotifyConnected ? (
            <button
              onClick={() => {
                spotifyLogout();
                setSpotifyConnected(false);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/5 text-foreground/80 text-[11px] font-bold uppercase tracking-[0.18em] hover:bg-white/10 transition active:scale-95"
            >
              {lang === "da" ? "Log ud" : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={() => {
                if (!isSpotifyConfigured()) return;
                void beginAuth();
              }}
              disabled={!isSpotifyConfigured()}
              className="px-3 py-1.5 rounded-lg bg-neon text-primary-foreground text-[11px] font-bold uppercase tracking-[0.18em] shadow-neon hover:opacity-90 transition active:scale-95 disabled:opacity-40"
            >
              {lang === "da" ? "Forbind" : "Connect"}
            </button>
          )}
        </div>
      </section>


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

      {/* Privacy notice */}
      <section className="mt-4 glass rounded-2xl p-4 flex gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon shrink-0">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold mb-1">
            {lang === "da" ? "Privatliv" : "Privacy"}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {lang === "da"
              ? "Din GPS-data bruges udelukkende til at spore dine løb og gemmes lokalt på din enhed. Vi sender ingen personlige data til tredjepart."
              : "Your GPS data is used only to track your runs and is stored locally on this device. No personal data is shared with third parties."}
          </p>
        </div>
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Orbit Lab · v1.0
      </p>
    </main>
  );
}
