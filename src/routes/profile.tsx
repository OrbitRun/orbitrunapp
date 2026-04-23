import { createFileRoute } from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { Bell, Headphones, Languages, MapPin, Target, Volume2, Zap } from "lucide-react";
import { loadRuns } from "@/lib/run-types";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { useI18n, type Lang } from "@/lib/i18n";
import ShoesSection from "@/components/ShoesSection";
import {
  DEFAULT_PROFILE,
  goalLabel,
  loadProfile,
  saveProfile,
  type ExperienceLevel,
  type RunningGoal,
  type UserProfile,
} from "@/lib/user-profile";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [stats, setStats] = useState({ count: 0, distance: 0, time: 0 });
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    const runs = loadRuns();
    setStats({
      count: runs.length,
      distance: runs.reduce((a, r) => a + r.distanceM, 0),
      time: runs.reduce((a, r) => a + r.durationMs, 0),
    });
    setProfile(loadProfile());
  }, []);

  const update = (patch: Partial<UserProfile>) => {
    const next = { ...profile, ...patch, onboarded: true };
    setProfile(next);
    saveProfile(next);
  };

  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "da", label: "Dansk" },
  ];

  const goals: RunningGoal[] = ["run5k", "runFaster", "weightLoss", "marathon"];
  const initial = (profile.name?.trim()?.charAt(0) || "R").toUpperCase();

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-8">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("profile.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("profile.title")}</h1>
      </header>

      {/* Premium Member Card */}
      <section className="relative overflow-hidden rounded-2xl p-4 border border-neon/20 bg-gradient-to-br from-[oklch(0.18_0.04_160)] via-[oklch(0.13_0.02_160)] to-[oklch(0.10_0.01_160)] shadow-card">
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.92 0.21 130 / 0.5), transparent)" }}
        />
        <div className="relative flex items-center justify-between">
          <div className="text-[8px] uppercase tracking-[0.4em] text-neon font-black">
            {t("profile.memberCard")}
          </div>
          <div className="text-[8px] uppercase tracking-[0.3em] text-muted-foreground/80 font-bold">
            Orbit Lab
          </div>
        </div>
        <div className="relative mt-3 flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-neon to-[oklch(0.7_0.18_175)] grid place-items-center text-lg font-black text-background shadow-neon ring-1 ring-neon/40">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <input
              value={profile.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder={t("profile.namePlaceholder")}
              maxLength={24}
              aria-label={t("profile.name")}
              className="w-full bg-transparent border-0 border-b border-transparent hover:border-white/10 focus:border-neon focus:outline-none font-display font-bold text-base leading-tight truncate px-0 py-0 transition-colors placeholder:text-muted-foreground/60"
            />
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 uppercase tracking-[0.14em] font-semibold">
              <Target className="h-2.5 w-2.5 text-neon" />
              {goalLabel(profile.goal, lang)}
            </div>
          </div>
        </div>
        <div className="relative mt-3 pt-3 border-t border-white/10 grid grid-cols-3">
          <div className="text-center">
            <div className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground font-bold leading-none">
              {t("profile.runs")}
            </div>
            <div className="mt-1 font-display font-black text-xl text-neon tabular leading-none">
              {stats.count}
            </div>
          </div>
          <div className="text-center border-x border-white/10">
            <div className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground font-bold leading-none">
              {t("profile.km")}
            </div>
            <div className="mt-1 font-display font-black text-xl tabular leading-none">
              {formatDistance(stats.distance)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[8px] uppercase tracking-[0.25em] text-muted-foreground font-bold leading-none">
              {t("profile.time")}
            </div>
            <div className="mt-1 font-display font-black text-xl tabular leading-none">
              {formatDuration(stats.time)}
            </div>
          </div>
        </div>
      </section>


      {/* Goal */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Target className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.goal")}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {goals.map((g) => (
            <button
              key={g}
              onClick={() => update({ goal: g })}
              className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-[0.1em] transition active:scale-95 ${
                profile.goal === g
                  ? "bg-neon text-primary-foreground shadow-neon"
                  : "bg-white/5 text-foreground/80 hover:bg-white/10 border border-white/10"
              }`}
            >
              {goalLabel(g, lang)}
            </button>
          ))}
        </div>
      </section>

      {/* Experience level */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.level")}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["beginner", "expert"] as ExperienceLevel[]).map((lv) => (
            <button
              key={lv}
              onClick={() => update({ level: lv })}
              className={`p-3 rounded-xl text-left transition active:scale-95 ${
                profile.level === lv
                  ? "bg-neon text-primary-foreground"
                  : "bg-white/5 border-2 border-white/10 hover:bg-white/10"
              }`}
            >
              <div
                className={`text-xs font-black uppercase tracking-[0.12em] ${profile.level === lv ? "text-primary-foreground" : ""}`}
              >
                {t(`profile.level.${lv}`)}
              </div>
              <div className={`mt-1 text-[10px] leading-tight ${profile.level === lv ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {t(`profile.level.${lv}Hint`)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <ShoesSection />

      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        {[
          { Icon: Volume2, label: t("profile.audio"), value: t("profile.audio.value") },
          { Icon: Bell, label: t("profile.haptic"), value: t("profile.haptic.value") },
          { Icon: MapPin, label: t("profile.gps"), value: t("profile.gps.value") },
          { Icon: Headphones, label: t("profile.music"), value: t("profile.music.value") },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{value}</div>
          </div>
        ))}
        <button
          onClick={() => setLang(lang === "da" ? "en" : "da")}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Languages className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.language")}</div>
          <div className="text-xs text-muted-foreground">
            {langs.find((l) => l.code === lang)?.label}
          </div>
        </button>
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Orbit Lab · v1.0
      </p>
    </main>
  );
}
