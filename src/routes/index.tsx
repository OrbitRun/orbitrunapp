import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Mountain, Pause, Pencil, Play, Square, Timer, Zap } from "lucide-react";
import RunMap from "@/components/RunMap";
import MusicHub from "@/components/MusicHub";
import CountdownOverlay from "@/components/CountdownOverlay";
import RunSummary from "@/components/RunSummary";
import EditableStat from "@/components/EditableStat";
import MetricPicker from "@/components/MetricPicker";
import { useRunTracker } from "@/hooks/use-run-tracker";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { primeAudio } from "@/lib/audio-cues";
import { formatPace } from "@/lib/run-utils";
import { useI18n } from "@/lib/i18n";
import {
  DEFAULT_LAYOUT,
  loadLayout,
  saveLayout,
  type MetricId,
  type StatLayout,
} from "@/lib/stat-metrics";
import type { Run } from "@/lib/run-types";
import logo from "@/assets/orbit-lab-logo.png";

export const Route = createFileRoute("/")({
  component: RunPage,
});

function RunPage() {
  const t = useRunTracker();
  const { t: tr } = useI18n();
  const [pressed, setPressed] = useState<string | null>(null);
  const [counting, setCounting] = useState(false);
  const [pendingRun, setPendingRun] = useState<Run | null>(null);
  const wakeLock = useWakeLock();

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
    setLayout(loadLayout());
  }, []);

  const isActive = t.status === "running" || t.status === "paused";

  const beginCountdown = useCallback(() => {
    setPressed("start");
    primeAudio();
    void wakeLock.request();
    // Pre-arm GPS so the first fix is ready when the run actually starts
    t.armGps();
    setCounting(true);
  }, [wakeLock, t]);

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

  const handleSave = useCallback(() => {
    if (pendingRun) t.commitRun(pendingRun);
    setPendingRun(null);
    void wakeLock.release();
  }, [pendingRun, t, wakeLock]);

  const handleDiscard = useCallback(() => {
    t.discardRun();
    setPendingRun(null);
    void wakeLock.release();
  }, [t, wakeLock]);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      {counting && <CountdownOverlay onComplete={launchRun} onCancel={cancelCountdown} />}
      {pendingRun && <RunSummary run={pendingRun} onSave={handleSave} onDiscard={handleDiscard} />}
      <header className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3 min-w-0">
          <img
            src={logo}
            alt="ORBIT LAB"
            className="h-10 w-10 object-contain drop-shadow-[0_0_12px_oklch(0.92_0.21_130/0.5)]"
          />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              {tr("app.brand")}
            </div>
            <h1 className="font-display font-black text-xl tracking-tight truncate">
              {t.status === "running"
                ? tr("status.running")
                : t.status === "paused"
                  ? tr("status.paused")
                  : t.status === "finished"
                    ? tr("status.finished")
                    : tr("status.ready")}
            </h1>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full glass grid place-items-center">
          <span
            className={`h-2.5 w-2.5 rounded-full ${t.status === "running" ? "bg-neon pulse-ring" : "bg-muted-foreground/40"}`}
          />
        </div>
      </header>

      <section className="relative">
        <div className="rounded-3xl overflow-hidden border border-border shadow-card">
          <RunMap points={t.points} className="h-[260px] w-full" interactive={!isActive} />
        </div>
        {t.points.length === 0 && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="glass-strong rounded-2xl px-4 py-2 text-xs text-muted-foreground">
              {t.permissionError ?? tr("map.placeholder")}
            </div>
          </div>
        )}
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
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass-strong rounded-3xl p-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {tr("stat.distance")}
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="font-display font-black tabular text-[44px] leading-none text-neon">
              {distanceKm}
            </span>
            <span className="text-xs text-muted-foreground font-bold">{tr("unit.km")}</span>
          </div>
        </div>
        <div className="glass-strong rounded-3xl p-5 text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {tr("stat.duration")}
          </div>
          <div className="mt-1 flex items-baseline justify-center">
            <span className="font-display font-black tabular text-[44px] leading-none text-foreground">
              {formatDuration(t.elapsedMs)}
            </span>
          </div>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-3 gap-3">
        <StatTile
          label={tr("stat.pace")}
          value={formatPace(t.currentPaceSecPerKm || t.avgPaceSecPerKm)}
          unit={tr("unit.perKm")}
          glow={
            t.currentPaceSecPerKm > 0 &&
            t.avgPaceSecPerKm > 0 &&
            t.currentPaceSecPerKm < t.avgPaceSecPerKm - 3
          }
        />
        <StatTile label={tr("stat.cadence")} value={String(t.cadenceSpm)} unit={tr("unit.spm")} />
        <StatTile label={tr("stat.elev")} value={Math.round(t.elevationGainM).toString()} unit={tr("unit.m")} />
      </section>

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

      <section className="mt-3">
        <MusicHub />
      </section>

      <section className="mt-5 mb-6 flex items-center justify-center gap-4">
        {t.status === "idle" || t.status === "finished" ? (
          <button
            onClick={beginCountdown}
            className={`relative h-24 w-24 rounded-full bg-neon text-primary-foreground grid place-items-center shadow-neon active:scale-95 transition ${pressed === "start" ? "press-anim" : ""}`}
            aria-label={tr("ctrl.start")}
          >
            <Play className="h-9 w-9 ml-1" />
            <span className="absolute -bottom-7 text-[10px] uppercase tracking-[0.25em] font-bold text-foreground">
              {tr("ctrl.start")}
            </span>
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

      <section className="grid grid-cols-3 gap-2 mb-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5 justify-center">
          <Timer className="h-3 w-3 text-neon" /> {tr("hint.autoSplits")}
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <Zap className="h-3 w-3 text-neon" /> {tr("hint.voice")}
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <Mountain className="h-3 w-3 text-neon" /> {tr("hint.elevation")}
        </div>
      </section>
    </main>
  );
}
