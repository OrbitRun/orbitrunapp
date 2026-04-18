import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Mountain, Pause, Play, Square, Timer, Zap } from "lucide-react";
import RunMap from "@/components/RunMap";
import StatTile from "@/components/StatTile";
import MusicHub from "@/components/MusicHub";
import { useRunTracker } from "@/hooks/use-run-tracker";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";

export const Route = createFileRoute("/")({
  component: RunPage,
});

function RunPage() {
  const t = useRunTracker();
  const [pressed, setPressed] = useState<string | null>(null);

  // animate press
  useEffect(() => {
    if (!pressed) return;
    const id = setTimeout(() => setPressed(null), 200);
    return () => clearTimeout(id);
  }, [pressed]);

  const isActive = t.status === "running" || t.status === "paused";
  const distanceKm = useMemo(() => formatDistance(t.distanceM), [t.distanceM]);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      {/* Header */}
      <header className="flex items-center justify-between py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            Pulse
          </div>
          <h1 className="font-display font-black text-2xl tracking-tight">
            {t.status === "running"
              ? "In motion"
              : t.status === "paused"
                ? "Paused"
                : t.status === "finished"
                  ? "Run saved"
                  : "Ready to run"}
          </h1>
        </div>
        <div className="h-10 w-10 rounded-full glass grid place-items-center">
          <span
            className={`h-2.5 w-2.5 rounded-full ${t.status === "running" ? "bg-neon pulse-ring" : "bg-muted-foreground/40"}`}
          />
        </div>
      </header>

      {/* Map */}
      <section className="relative">
        <div className="rounded-3xl overflow-hidden border border-border shadow-card">
          <RunMap
            points={t.points}
            className="h-[260px] w-full"
            interactive={!isActive}
          />
        </div>
        {t.points.length === 0 && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="glass-strong rounded-2xl px-4 py-2 text-xs text-muted-foreground">
              {t.permissionError ?? "Press start to begin tracking"}
            </div>
          </div>
        )}
        {/* Speed legend */}
        <div className="absolute bottom-3 right-3 glass rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-[10px] font-semibold">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-[var(--speed-slow)]" />
            slow
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-[var(--speed-mid)]" />
            mid
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-[var(--speed-fast)]" />
            fast
          </span>
        </div>
      </section>

      {/* Hero stat */}
      <section className="mt-4 glass-strong rounded-3xl p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          Distance
        </div>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span className="font-display font-black tabular text-[68px] leading-none text-neon">
            {distanceKm}
          </span>
          <span className="text-sm text-muted-foreground font-semibold">km</span>
        </div>
      </section>

      {/* Stat grid */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatTile
          label="Duration"
          value={formatDuration(t.elapsedMs)}
        />
        <StatTile
          label="Pace"
          value={formatPace(t.currentPaceSecPerKm || t.avgPaceSecPerKm)}
          unit="/km"
        />
        <StatTile
          label="Cadence"
          value={String(t.cadenceSpm)}
          unit="spm"
        />
        <StatTile
          label="Elevation"
          value={Math.round(t.elevationGainM).toString()}
          unit="m"
        />
      </section>

      {/* Splits */}
      {t.splits.length > 0 && (
        <section className="mt-3 glass rounded-2xl p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold px-1 pb-2">
            Splits
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {t.splits.map((s) => (
              <div
                key={s.km}
                className="flex-shrink-0 w-20 rounded-xl bg-white/5 px-2 py-2 text-center"
              >
                <div className="text-[10px] text-muted-foreground font-semibold">
                  KM {s.km}
                </div>
                <div className="font-mono text-sm font-bold text-neon">
                  {formatPace(s.paceSecPerKm)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Music */}
      <section className="mt-3">
        <MusicHub />
      </section>

      {/* Controls */}
      <section className="mt-5 mb-6 flex items-center justify-center gap-4">
        {t.status === "idle" || t.status === "finished" ? (
          <button
            onClick={() => {
              setPressed("start");
              t.start();
            }}
            className={`relative h-24 w-24 rounded-full bg-neon text-primary-foreground grid place-items-center shadow-neon active:scale-95 transition ${pressed === "start" ? "press-anim" : ""}`}
            aria-label="Start run"
          >
            <Play className="h-9 w-9 ml-1" />
            <span className="absolute -bottom-7 text-[10px] uppercase tracking-[0.25em] font-bold text-foreground">
              Start
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
                aria-label="Pause"
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
                aria-label="Resume"
              >
                <Play className="h-6 w-6 ml-0.5" />
              </button>
            )}
            <button
              onClick={() => {
                setPressed("stop");
                t.stop();
              }}
              className={`h-20 w-20 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow-card active:scale-95 transition ${pressed === "stop" ? "press-anim" : ""}`}
              aria-label="Finish run"
            >
              <Square className="h-7 w-7" fill="currentColor" />
            </button>
          </>
        )}
      </section>

      {/* Hints row */}
      <section className="grid grid-cols-3 gap-2 mb-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5 justify-center">
          <Timer className="h-3 w-3 text-neon" /> Auto splits
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <Zap className="h-3 w-3 text-neon" /> Voice cues
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <Mountain className="h-3 w-3 text-neon" /> Elevation
        </div>
      </section>
    </main>
  );
}
