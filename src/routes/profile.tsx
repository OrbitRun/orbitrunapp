import { createFileRoute, Link } from "@tanstack/react-router";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, FileText, Heart, Info, Languages, MapPin, PauseCircle, ShieldCheck, Sparkles, Timer, Trophy, Volume2, Wind, Zap } from "lucide-react";
import { loadRuns } from "@/lib/run-types";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { useI18n, type Lang } from "@/lib/i18n";
import ShoesSection from "@/components/ShoesSection";
import CoachOnboarding from "@/components/CoachOnboarding";
import RecoveryStatus from "@/components/RecoveryStatus";
import HealthPermissionSheet from "@/components/HealthPermissionSheet";
import LegalSheet from "@/components/LegalSheet";
import CoachInfoModal from "@/components/CoachInfoModal";
import SensorsSection from "@/components/SensorsSection";
import IntegrationsSection from "@/components/IntegrationsSection";
import { isHealthAvailable, type HealthPermissionStatus } from "@/lib/health";
import { useHrZones } from "@/hooks/use-hr-zones";

import {
  DEFAULT_PROFILE,
  goalLabel,
  loadProfile,
  saveProfile,
  coachLevelLabel,
  coachFrequencyLabel,
  coachGoalLabel,
  COUNTDOWN_OPTIONS,
  effectiveMaxHr,
  type AudioCueMeters,
  type CoachConfig,
  type CountdownSeconds,
  type ExperienceLevel,
  type UserProfile,
  type WindUnit,
} from "@/lib/user-profile";
import { defaultConfig, loadHrZones, saveHrZones } from "@/lib/hr-zones-config";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const [stats, setStats] = useState({ count: 0, distance: 0, time: 0 });
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const { t, lang, setLang } = useI18n();
  
  const [coachOpen, setCoachOpen] = useState(false);
  const [healthOpen, setHealthOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState<HealthPermissionStatus>(
    isHealthAvailable() ? "denied" : "unavailable",
  );
  const healthAvailable = isHealthAvailable();
  const hrZones = useHrZones();
  const [legalOpen, setLegalOpen] = useState<"privacy" | "terms" | null>(null);
  const [coachInfoOpen, setCoachInfoOpen] = useState(false);

  const handleOpenCoachOnboarding = () => {
    setCoachInfoOpen(false);
    requestAnimationFrame(() => setCoachOpen(true));
  };


  useEffect(() => {
    const all = loadRuns();
    setStats({
      count: all.length,
      distance: all.reduce((a, r) => a + r.distanceM, 0),
      time: all.reduce((a, r) => a + r.durationMs, 0),
    });
    setProfile(loadProfile());
  }, []);

  const update = (patch: Partial<UserProfile>) => {
    const next = { ...profile, ...patch, onboarded: true };
    // Sync audio cue interval with experience level when level changes
    if (patch.level && patch.audioCueMeters === undefined) {
      next.audioCueMeters = patch.level === "novice" ? 500 : 1000;
    }
    setProfile(next);
    saveProfile(next);
  };

  const toggleAudioCue = () => {
    const next: AudioCueMeters = profile.audioCueMeters === 500 ? 1000 : 500;
    update({ audioCueMeters: next });
  };

  const langs: { code: Lang; label: string }[] = [
    { code: "en", label: "English" },
    { code: "da", label: "Dansk" },
  ];

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
        <div className="relative flex items-center">
          <div className="text-[8px] uppercase tracking-[0.4em] text-neon font-black">
            Orbit Run · {t("profile.athlete")}
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
              className="w-full bg-transparent border-0 border-b border-transparent hover:border-white/10 focus:border-neon focus:outline-none font-display font-black text-xl tabular leading-none truncate px-0 py-0 transition-colors placeholder:text-muted-foreground/60"
            />
            <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-[0.14em] font-semibold">
              {t(`profile.level.${profile.level}`)}
              {profile.coach ? ` · ${coachGoalLabel(profile.coach.goal, lang)}` : ` · ${goalLabel(profile.goal, lang)}`}
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

      <ShoesSection />

      {/* Experience level */}
      <section className="mt-4 glass rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Zap className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("profile.level")}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["novice", "beginner", "expert", "elite"] as ExperienceLevel[]).map((lv) => (
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

      <MyProfileSection
        coach={profile.coach}
        onUpdate={(patch: Partial<CoachConfig>) => {
          const cur = profile.coach;
          const nextCoach: CoachConfig = {
            level: cur?.level ?? "3-5",
            frequency: cur?.frequency ?? "3-4",
            goal: cur?.goal ?? "finish5k",
            ...cur,
            ...patch,
            configuredAt: cur?.configuredAt ?? Date.now(),
          };
          const next = { ...profile, coach: nextCoach };
          setProfile(next);
          saveProfile(next);
          if (patch.maxHrKnown !== undefined || patch.age !== undefined) {
            const eff = effectiveMaxHr(nextCoach);
            const z = loadHrZones();
            const restingHr = z?.restingHr ?? 60;
            const age = nextCoach.age ?? (eff ? 220 - eff : 35);
            saveHrZones(defaultConfig(age, restingHr));
          }
        }}
      />

      {/* Orbit Coach */}
      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        <button
          onClick={() => update({ coachEnabled: profile.coachEnabled === false })}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{t("coach.enable")}</div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCoachInfoOpen(true);
              }}
              aria-label={t("coach.info.title")}
              className="h-6 w-6 grid place-items-center rounded-lg text-muted-foreground hover:text-neon hover:bg-white/5 transition"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <div className="text-xs text-muted-foreground">
            {t(profile.coachEnabled === false ? "coach.enable.off" : "coach.enable.on")}
          </div>
        </button>
        {profile.coachEnabled !== false && (
          <button
            onClick={() => setCoachOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
          >
            <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm font-semibold">{t("coach.profileRow")}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[55%] text-right">
              {profile.coach
                ? `${coachLevelLabel(profile.coach.level, lang)} · ${coachFrequencyLabel(profile.coach.frequency, lang)} · ${coachGoalLabel(profile.coach.goal, lang)}`
                : t("coach.profileRow.unset")}
            </div>
          </button>
        )}
      </section>

      {/* HR zones shortcut */}
      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        <Link
          to="/profile/heart-rate"
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <Heart className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("hrz.profileRow")}</div>
          <div className="text-xs text-muted-foreground tabular">
            {hrZones
              ? `${hrZones.zones[1].lower}–${hrZones.zones[3].upper} bpm`
              : t("hrz.profileRow.unset")}
          </div>
        </Link>
      </section>

      <SensorsSection />

      <IntegrationsSection />

      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        <SettingRowWithInfo
          icon={<Volume2 className="h-4 w-4" />}
          label={t("profile.audio")}
          valueText={t(`profile.audio.value.${profile.audioCueMeters}`)}
          infoText={t("profile.audio.info")}
          onToggle={toggleAudioCue}
        />
        <SettingRowWithInfo
          icon={<Trophy className="h-4 w-4" />}
          label={t("profile.prVoice")}
          valueText={profile.prVoiceEnabled ? t("profile.prVoice.value.on") : t("profile.prVoice.value.off")}
          infoText={t("profile.prVoice.info")}
          onToggle={() => update({ prVoiceEnabled: !profile.prVoiceEnabled })}
        />
        <CountdownPickerRow
          value={(profile.countdownSeconds ?? 10) as CountdownSeconds}
          offLabel={t("profile.countdown.off")}
          label={t("profile.countdown")}
          infoText={t("profile.countdown.info")}
          onChange={(v) => update({ countdownSeconds: v })}
        />
        <SettingRowWithInfo
          icon={<PauseCircle className="h-4 w-4" />}
          label={t("profile.autoPause")}
          valueText={t(profile.autoPauseEnabled === false ? "profile.autoPause.off" : "profile.autoPause.on")}
          infoText={t("profile.autoPause.info")}
          onToggle={() => update({ autoPauseEnabled: profile.autoPauseEnabled === false })}
        />
        <SettingRowWithInfo
          icon={<ShieldCheck className="h-4 w-4" />}
          label={t("profile.flightRecorder")}
          valueText={t(profile.flightRecorderEnabled === false ? "profile.flightRecorder.off" : "profile.flightRecorder.on")}
          infoText={t(profile.flightRecorderEnabled === false ? "profile.flightRecorder.info.off" : "profile.flightRecorder.info.on")}
          infoBadge={profile.flightRecorderEnabled === false ? t("profile.flightRecorder.off") : t("profile.flightRecorder.on")}
          onToggle={() => update({ flightRecorderEnabled: profile.flightRecorderEnabled === false })}
        />
        <SettingRowWithInfo
          icon={<Bell className="h-4 w-4" />}
          label={t("profile.haptic")}
          valueText={profile.hapticEnabled ? t("profile.haptic.value.on") : t("profile.haptic.value.off")}
          infoText={t("profile.haptic.info")}
          onToggle={() => {
            const next = !profile.hapticEnabled;
            update({ hapticEnabled: next });
            if (next && typeof navigator !== "undefined" && "vibrate" in navigator) {
              try { navigator.vibrate(40); } catch { /* noop */ }
            }
          }}
        />
        <SettingRowWithInfo
          icon={<Wind className="h-4 w-4" />}
          label={t("profile.windUnit")}
          valueText={profile.windUnit === "kmh" ? "km/h" : "m/s"}
          infoText={t("profile.windUnit.info")}
          onToggle={() => {
            const next: WindUnit = profile.windUnit === "ms" ? "kmh" : "ms";
            update({ windUnit: next });
          }}
        />
        {[
          { Icon: MapPin, label: t("profile.gps"), value: t("profile.gps.value") },
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

      {/* Legal */}
      <div className="mt-6 mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
        {t("legal.section")}
      </div>
      <section className="glass rounded-2xl divide-y divide-border">
        <button
          onClick={() => setLegalOpen("privacy")}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("legal.privacy.row")}</div>
          <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
        </button>
        <button
          onClick={() => setLegalOpen("terms")}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left"
        >
          <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1 text-sm font-semibold">{t("legal.terms.row")}</div>
          <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
        </button>
      </section>

      <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Orbit Run · v1.0
      </p>
      {coachOpen && <CoachOnboarding onClose={() => { setCoachOpen(false); setProfile(loadProfile()); }} />}
      <HealthPermissionSheet
        open={healthOpen}
        onOpenChange={setHealthOpen}
        onResult={setHealthStatus}
      />
      <LegalSheet
        open={legalOpen !== null}
        onClose={() => setLegalOpen(null)}
        kind={legalOpen ?? "privacy"}
      />
      <CoachInfoModal
        open={coachInfoOpen}
        onClose={() => setCoachInfoOpen(false)}
        onNavigateToSettings={handleOpenCoachOnboarding}
      />
    </main>
  );
}

type SettingRowWithInfoProps = {
  icon: React.ReactNode;
  label: string;
  valueText: string;
  infoText: string;
  infoBadge?: string;
  onToggle: () => void;
};

function SettingRowWithInfo({ icon, label, valueText, infoText, infoBadge, onToggle }: SettingRowWithInfoProps) {
  const [open, setOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleRowToggle = () => {
    onToggle();
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    setAutoOpen(true);
    timerRef.current = window.setTimeout(() => {
      setAutoOpen(false);
      timerRef.current = null;
    }, 5000);
  };

  const expanded = open || autoOpen;

  return (
    <>
      <div
        onClick={handleRowToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowToggle();
          }
        }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer text-left"
      >
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          {icon}
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{label}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (timerRef.current != null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              setAutoOpen(false);
              setOpen((v) => !v);
            }}
            aria-label="Toggle info"
            className="h-6 w-6 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        <div className="text-xs text-muted-foreground">{valueText}</div>
      </div>
      <div
        className={`grid transition-all duration-300 ease-out ${
          expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.02] border-l-2 border-neon/30">
            <div className="flex items-start gap-2">
              {infoBadge && (
                <div className="text-[10px] uppercase tracking-[0.18em] text-neon font-bold mt-0.5 shrink-0">
                  {infoBadge}
                </div>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground">{infoText}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

type CountdownPickerRowProps = {
  value: CountdownSeconds;
  offLabel: string;
  label: string;
  infoText: string;
  onChange: (v: CountdownSeconds) => void;
};

function CountdownPickerRow({ value, offLabel, label, infoText, onChange }: CountdownPickerRowProps) {
  const [open, setOpen] = useState(false);
  const display = value === 0 ? offLabel : `${value} s`;
  return (
    <>
      <div className="relative w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer text-left">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <Timer className="h-4 w-4" />
        </div>
        <div className="relative z-10 flex items-center gap-1 flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{label}</div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
            aria-label="Toggle info"
            className="h-6 w-6 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="relative z-10 text-xs text-muted-foreground pointer-events-none">{display}</div>
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) as CountdownSeconds)}
          className="absolute inset-0 opacity-0 cursor-pointer z-0"
        >
          {COUNTDOWN_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 0 ? offLabel : `${s} s`}
            </option>
          ))}
        </select>
      </div>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.02] border-l-2 border-neon/30">
            <p className="text-[11px] leading-snug text-muted-foreground">{infoText}</p>
          </div>
        </div>
      </div>
    </>
  );
}


function MyProfileSection({
  coach,
  onUpdate,
}: {
  coach?: CoachConfig;
  onUpdate: (patch: Partial<CoachConfig>) => void;
}) {
  const { t } = useI18n();
  const derivedMaxHr = effectiveMaxHr(coach);
  const showDerived = !coach?.maxHrKnown && derivedMaxHr != null;

  const numField = (
    label: string,
    value: number | undefined,
    onCommit: (v: number | undefined) => void,
    placeholder: string,
    inputMode: "decimal" | "numeric" = "numeric",
  ) => (
    <label className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 text-sm font-semibold">{label}</div>
      <input
        inputMode={inputMode}
        defaultValue={value != null ? String(value) : ""}
        onBlur={(e) => {
          const raw = e.target.value.replace(",", ".").trim();
          if (!raw) return onCommit(undefined);
          const n = parseFloat(raw);
          onCommit(Number.isFinite(n) ? n : undefined);
        }}
        placeholder={placeholder}
        className="w-24 h-10 rounded-xl bg-white/5 border border-white/10 px-3 text-center text-sm font-bold tabular focus:border-neon outline-none"
      />
    </label>
  );

  return (
    <>
      <div className="mt-6 mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
        {t("profile.section.myProfile")}
      </div>
      <section className="glass rounded-2xl divide-y divide-border">
        {numField(
          t("profile.weight"),
          coach?.weightKg,
          (v) => onUpdate({ weightKg: v != null ? Math.max(30, Math.min(250, v)) : undefined }),
          "kg",
          "decimal",
        )}
        {numField(
          t("profile.height"),
          coach?.heightCm,
          (v) =>
            onUpdate({ heightCm: v != null ? Math.max(100, Math.min(230, Math.round(v))) : undefined }),
          "cm",
        )}
        <div>
          {numField(
            t("profile.maxHr"),
            coach?.maxHrKnown,
            (v) =>
              onUpdate({
                maxHrKnown:
                  v != null ? Math.max(120, Math.min(230, Math.round(v))) : undefined,
              }),
            t("profile.maxHr.placeholder"),
          )}
          {showDerived && (
            <p className="px-4 pb-3 -mt-1 text-[10px] text-muted-foreground">
              {t("profile.maxHr.derived", { value: derivedMaxHr })}
            </p>
          )}
        </div>
      </section>
    </>
  );
}
