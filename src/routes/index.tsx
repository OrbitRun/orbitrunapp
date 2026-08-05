import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Check, Ghost, Pause, Pencil, Play, Square, X } from "lucide-react";
import RunMap from "@/components/RunMap";

import CountdownOverlay from "@/components/CountdownOverlay";
import RunSummary from "@/components/RunSummary";
import EditableStat from "@/components/EditableStat";
import MetricPicker from "@/components/MetricPicker";
import Onboarding from "@/components/Onboarding";
// CoachCard moved to /coach route
import FocusRunView from "@/components/FocusRunView";
import RecoverRunBanner from "@/components/RecoverRunBanner";
import DailyStatusStrip from "@/components/DailyStatusStrip";
import SourceSignalChip from "@/components/SourceSignalChip";

import HealthPermissionSheet, { shouldAskHealthPermission } from "@/components/HealthPermissionSheet";

import { useRunTracker } from "@/hooks/use-run-tracker";
import { useWakeLock } from "@/hooks/use-wake-lock";

import { primeAudio } from "@/lib/audio-cues";
import { formatPace } from "@/lib/run-utils";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_LAYOUT,
  loadLayout,
  saveLayout,
  METRICS,
  heroFontSizeFor,
  secondaryFontSizeFor,
  type MetricId,
  type StatLayout,
} from "@/lib/stat-metrics";
import type { Run } from "@/lib/run-types";
import { updateRun } from "@/lib/run-types";
import { displayName, goalLabel, loadProfile, type UserProfile, DEFAULT_PROFILE, coachGoalLabel } from "@/lib/user-profile";
import {
  clearGhost,
  GHOST_CHANGED_EVENT,
  loadGhost,
  type GhostRef,
} from "@/lib/ghost-runner";
import logo from "@/assets/08a0cc02-81da-4cc6-89d2-2c567d41b102.png";

export const Route = createFileRoute("/")({
  component: RunPage,
});

function RunPage() {
  const t = useRunTracker();
  const { t: tr, lang } = useI18n();
  const [pressed, setPressed] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);
  const [pendingRun, setPendingRun] = useState<Run | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);

  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const wakeLock = useWakeLock();
  

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (!p.onboarded) setShowOnboarding(true);
    const onUpdate = () => setProfile(loadProfile());
    window.addEventListener("orbit:profile-update", onUpdate);
    return () => window.removeEventListener("orbit:profile-update", onUpdate);
  }, []);

  useEffect(() => {
    if (!pressed) return;
    const id = setTimeout(() => setPressed(null), 200);
    return () => clearTimeout(id);
  }, [pressed]);

  // Editable stat layout
  const [layout, setLayout] = useState<StatLayout>(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<
    { kind: "hero" | "secondary"; index: number } | null
  >(null);

  useEffect(() => {
    setLayout(loadLayout(profile.level));
  }, [profile.level]);

  const [armedGhost, setArmedGhost] = useState<GhostRef | null>(null);
  useEffect(() => {
    setArmedGhost(loadGhost());
    const onChange = () => setArmedGhost(loadGhost());
    window.addEventListener(GHOST_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(GHOST_CHANGED_EVENT, onChange);
  }, []);

  // Warm GPS as soon as the page mounts (only if permission already granted),
  // so the first fix is cached when the user taps Start.
  useEffect(() => {
    t.warmGps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActive = t.status === "running" || t.status === "paused";

  const beginCountdown = useCallback(() => {
    setPressed("start");
    primeAudio();
    void wakeLock.request();
    // Pre-arm GPS so the first fix is ready when the run actually starts
    t.armGps();
    if (shouldAskHealthPermission()) setHealthOpen(true);
    const secs = profile.countdownSeconds ?? 10;
    if (secs === 0) {
      setCounting(false);
      t.start();
      window.dispatchEvent(new CustomEvent("orbit:run-start"));
    } else {
      setCounting(true);
    }
  }, [wakeLock, t, profile.countdownSeconds]);

  const launchRun = useCallback(() => {
    setCounting(false);
    t.start();
    window.dispatchEvent(new CustomEvent("orbit:run-start"));
  }, [t]);

  const cancelCountdown = useCallback(() => {
    setCounting(false);
    void wakeLock.release();
  }, [wakeLock]);

  const finishRun = useCallback(() => {
    setPressed("stop");
    const run = t.stop();
    window.dispatchEvent(new CustomEvent("orbit:run-stop"));
    if (run) {
      setPendingRun(run);
    } else {
      void wakeLock.release();
    }
  }, [t, wakeLock]);

  const handleSave = useCallback((rpe?: number) => {
    if (pendingRun) {
      const finalRun = typeof rpe === "number" ? { ...pendingRun, rpe } : pendingRun;
      t.commitRun(finalRun);
      if (typeof rpe === "number") {
        updateRun(finalRun.id, { rpe });
      }
      window.dispatchEvent(new CustomEvent("orbit:run-updated"));
    }
    setPendingRun(null);
    void wakeLock.release();
  }, [pendingRun, t, wakeLock]);

  const handleDiscard = useCallback(() => {
    t.discardRun();
    setPendingRun(null);
    void wakeLock.release();
  }, [t, wakeLock]);

  const userName = displayName(profile, lang);
  const greeting =
    t.status === "idle" || t.status === "finished"
      ? tr("greet.ready", { name: userName })
      : t.status === "running"
        ? tr("status.running")
        : t.status === "paused"
          ? tr("status.paused")
          : tr("status.finished");

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] [padding-bottom:calc(env(safe-area-inset-bottom)+6rem)]">
      {showOnboarding && <Onboarding onDone={() => setShowOnboarding(false)} />}
      {counting && <CountdownOverlay seconds={profile.countdownSeconds ?? 10} onComplete={launchRun} onCancel={cancelCountdown} />}
      <HealthPermissionSheet open={healthOpen} onOpenChange={setHealthOpen} />
      {pendingRun && <RunSummary run={pendingRun} onSave={handleSave} onDiscard={handleDiscard} />}
      {isActive && !pendingRun && (
        <FocusRunView
          tracker={t}
          layout={layout}
          onPause={() => { setPressed("pause"); t.pause(); }}
          onResume={() => { setPressed("resume"); t.resume(); }}
          onStop={finishRun}
        />
      )}

      <header className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="ORBIT RUN"
            className="h-10 w-10 object-contain drop-shadow-[0_0_12px_oklch(0.92_0.21_130/0.5)]"
          />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              {tr("app.brand")}
            </div>
            <h1 className="font-display font-black tracking-tight truncate text-base">{greeting}</h1>
            {(t.status === "idle" || t.status === "finished") && (
              <div className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">
                {tr("greet.goal", { goal: profile.coach ? coachGoalLabel(profile.coach.goal, lang, profile.coach.fasterDistance) : goalLabel(profile.goal, lang) })}
              </div>
            )}
          </div>
        </div>
        <div className="h-10 w-10 rounded-full glass grid place-items-center">
          <span
            className={`h-2.5 w-2.5 rounded-full ${t.status === "running" ? "bg-neon pulse-ring" : "bg-muted-foreground/40"}`}
          />
        </div>
      </header>

      {(t.status === "idle" || t.status === "finished") && profile.coachEnabled !== false && <DailyStatusStrip />}
      {(t.status === "idle" || t.status === "finished") && <RecoverRunBanner />}

      {(armedGhost || t.ghost) && (t.status === "idle" || t.status === "finished") && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <Ghost className="h-4 w-4 text-foreground/80 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold leading-none">
                {tr("ghost.active")}
              </div>
              <div className="text-xs font-bold truncate text-foreground/90 mt-0.5">
                {(armedGhost ?? t.ghost)?.label}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => clearGhost()}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            aria-label={tr("ghost.clear")}
          >
            <X className="h-3 w-3" />
            {tr("ghost.clear")}
          </button>
        </div>
      )}

      <section className="relative">
        {profile.activityEnvironment === "indoor" ? (
          <div className="rounded-3xl overflow-hidden border border-border shadow-card h-[clamp(160px,28dvh,280px)] flex flex-col items-center justify-center bg-white/5">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-black">
              {tr("indoor.preview.title")}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground font-semibold">
              {tr("indoor.preview.hint")}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl overflow-hidden border border-border shadow-card">
            <RunMap
              points={t.points}
              className="h-[clamp(160px,28dvh,280px)] w-full"
              interactive={!isActive}
              ghost={
                t.ghost
                  ? { path: t.ghost.path, elapsedMs: t.elapsedMs }
                  : null
              }
            />
          </div>
        )}
        <div className="absolute top-3 left-3 pointer-events-none">
          <SourceSignalChip source={t.motionSource} accuracyM={t.gpsAccuracyM} ready={t.gpsReady} />
        </div>
        {t.points.length === 0 && t.permissionError && (
          <div className="absolute inset-x-3 top-3 pointer-events-none">
            <div className="glass-strong rounded-xl px-3 py-1.5 text-[11px] text-destructive text-center">
              {t.permissionError}
            </div>
          </div>
        )}
        {profile.activityEnvironment !== "indoor" && (
          <div className="absolute bottom-3 right-3 glass rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-[10px] font-semibold">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[var(--speed-slow)]" />
              {tr("map.legend.slow")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[var(--speed-mid)]" />
              {tr("map.legend.mid")}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full bg-[var(--speed-fast)]" />
              {tr("map.legend.fast")}
            </span>
          </div>
        )}
      </section>

      <section className="mt-4 flex items-center justify-end px-1">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
          {editMode ? tr("edit.pickHint") : ""}
        </div>
        {editMode && (
          <button
            onClick={() => setEditMode(false)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon text-primary-foreground text-[10px] font-black uppercase tracking-[0.18em]"
          >
            <Check className="h-3 w-3" />
            {tr("edit.exit")}
          </button>
        )}
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full glass text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            aria-label="Edit layout"
          >
            <Pencil className="h-3 w-3" />
          </button>
        )}
      </section>

      <section className="mt-2 relative grid grid-cols-2 gap-3">
        {(() => {
          const heroSizeClass = heroFontSizeFor(
            layout.hero.map((id) => METRICS[id].format(t)),
          );
          return layout.hero.map((id, i) => (
            <EditableStat
              key={`hero-${i}`}
              metricId={id}
              stats={t}
              variant="hero"
              editMode={editMode}
              heroValueSizeClass={heroSizeClass}
              heroPosition={i === 0 ? "left" : "right"}
              onLongPress={() => {
                setEditMode(true);
                setPickerSlot({ kind: "hero", index: i });
              }}
              onTap={() => setPickerSlot({ kind: "hero", index: i })}
            />
          ));
        })()}
        {editMode && (
          <button
            type="button"
            onClick={() => {
              setLayout((prev) => {
                const next: StatLayout = {
                  hero: [prev.hero[1], prev.hero[0]] as [MetricId, MetricId],
                  secondary: [...prev.secondary] as [MetricId, MetricId, MetricId],
                };
                saveLayout(next, profile.level);
                return next;
              });
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-neon text-primary-foreground grid place-items-center active:scale-95 z-10"
            aria-label={tr("edit.swapHero")}
            title={tr("edit.swapHero")}
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>
        )}
      </section>

      <section className="mt-3 grid grid-cols-3 gap-3">
        {(() => {
          const secondarySize = secondaryFontSizeFor(
            layout.secondary.map((id) => {
              const def = METRICS[id];
              return {
                value: def.format(t),
                unit: def.unitKey ? tr(def.unitKey) : undefined,
              };
            }),
          );
          return layout.secondary.map((id, i) => (
            <EditableStat
              key={`sec-${i}`}
              metricId={id}
              stats={t}
              variant="secondary"
              editMode={editMode}
              secondaryValueSizeClass={secondarySize.valueClass}
              secondaryUnitSizeClass={secondarySize.unitClass}
              onLongPress={() => {
                setEditMode(true);
                setPickerSlot({ kind: "secondary", index: i });
              }}
              onTap={() => setPickerSlot({ kind: "secondary", index: i })}
              glow={
                id === "pace" &&
                t.currentPaceSecPerKm > 0 &&
                t.avgPaceSecPerKm > 0 &&
                t.currentPaceSecPerKm < t.avgPaceSecPerKm - 3
              }
            />
          ));
        })()}
      </section>

      <MetricPicker
        open={pickerSlot !== null}
        current={
          pickerSlot
            ? pickerSlot.kind === "hero"
              ? layout.hero[pickerSlot.index]
              : layout.secondary[pickerSlot.index]
            : null
        }
        used={[...layout.hero, ...layout.secondary]}
        onOpenChange={(o) => !o && setPickerSlot(null)}
        onSelect={(metric: MetricId) => {
          if (!pickerSlot) return;
          setLayout((prev) => {
            const next: StatLayout = {
              hero: [...prev.hero] as [MetricId, MetricId],
              secondary: [...prev.secondary] as [MetricId, MetricId, MetricId],
            };
            // If metric exists elsewhere, swap with current slot's metric.
            const currentMetric =
              pickerSlot.kind === "hero"
                ? next.hero[pickerSlot.index]
                : next.secondary[pickerSlot.index];
            const heroIdx = next.hero.indexOf(metric);
            const secIdx = next.secondary.indexOf(metric);
            if (heroIdx >= 0) next.hero[heroIdx] = currentMetric;
            if (secIdx >= 0) next.secondary[secIdx] = currentMetric;
            if (pickerSlot.kind === "hero") next.hero[pickerSlot.index] = metric;
            else next.secondary[pickerSlot.index] = metric;
            saveLayout(next, profile.level);
            return next;
          });
          setPickerSlot(null);
        }}
      />


      {t.splits.length > 0 && (
        <section className="mt-3 glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold px-1 pb-2">
            {tr("splits.title")}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {t.splits.map((s) => (
              <div key={s.km} className="flex-shrink-0 w-20 rounded-xl bg-white/5 px-2 py-2 text-center">
                <div className="text-[10px] text-muted-foreground font-semibold">
                  {tr("splits.km")} {s.km}
                </div>
                <div className="font-mono text-sm font-bold text-neon">{formatPace(s.paceSecPerKm)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="mt-5 mb-6 flex items-center justify-center gap-4">
        {t.status === "idle" || t.status === "finished" ? (
          <button
            onClick={beginCountdown}
            aria-label={tr("ctrl.start.run")}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/90 active:scale-[0.98] transition ${pressed === "start" ? "press-anim" : ""}`}
          >
            <Play className="h-3.5 w-3.5" />
            {tr("ctrl.start.run")}
          </button>
        ) : (
          <>
            {t.status === "running" ? (
              <button
                onClick={() => {
                  setPressed("pause");
                  t.pause();
                }}
                className={`h-16 w-16 rounded-full glass-strong grid place-items-center active:scale-95 transition ${pressed === "pause" ? "press-anim" : ""}`}
                aria-label={tr("ctrl.pause")}
              >
                <Pause className="h-6 w-6" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setPressed("resume");
                  t.resume();
                }}
                className={`h-16 w-16 rounded-full bg-neon text-primary-foreground grid place-items-center active:scale-95 transition ${pressed === "resume" ? "press-anim" : ""}`}
                aria-label={tr("ctrl.resume")}
              >
                <Play className="h-6 w-6 ml-0.5" />
              </button>
            )}
            <button
              onClick={finishRun}
              className={`h-20 w-20 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-card active:scale-95 transition ${pressed === "stop" ? "press-anim" : ""}`}
              aria-label={tr("ctrl.stop")}
            >
              <Square className="h-7 w-7" fill="currentColor" />
            </button>
          </>
        )}
      </section>

    </main>
  );
}
