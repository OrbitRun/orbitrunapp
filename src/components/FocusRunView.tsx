import { useCallback, useEffect, useRef, useState } from "react";
import { Bluetooth, Heart, Pause, Play, Square } from "lucide-react";
import RunMap from "@/components/RunMap";
import MusicHub from "@/components/MusicHub";
import { useI18n } from "@/lib/i18n";
import {
  ALL_METRIC_IDS,
  METRICS,
  type MetricId,
  type StatLayout,
} from "@/lib/stat-metrics";
import type { useRunTracker } from "@/hooks/use-run-tracker";
import { ZONE_VAR, zoneForBpm, type HrZoneId } from "@/lib/hr-zones-config";
import { useHrZones } from "@/hooks/use-hr-zones";

type Tracker = ReturnType<typeof useRunTracker>;

type Props = {
  tracker: Tracker;
  layout: StatLayout;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const STOP_HOLD_MS = 1200;


function formatGhostDelta(ms: number): string {
  const abs = Math.abs(ms);
  const m = Math.floor(abs / 60000);
  const s = Math.floor((abs % 60000) / 1000)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function FocusRunView({
  tracker,
  layout,
  onPause,
  onResume,
  onStop,
}: Props) {
  const { t: tr } = useI18n();

  // Lock global UI: hide bottom nav, kill body scroll/bounce.
  useEffect(() => {
    document.body.classList.add("focus-mode");
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.classList.remove("focus-mode");
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Live HR spike alert: tracker dispatches `orbit:hr-spike` whenever BPM
  // climbs >25 bpm in ~30s. We surface a transient banner that auto-hides.
  const [hrSpike, setHrSpike] = useState(false);
  useEffect(() => {
    let timer: number | null = null;
    const onSpike = () => {
      setHrSpike(true);
      try { navigator.vibrate?.([60, 40, 60]); } catch { /* noop */ }
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(() => setHrSpike(false), 6000);
    };
    window.addEventListener("orbit:hr-spike", onSpike);
    return () => {
      window.removeEventListener("orbit:hr-spike", onSpike);
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const carouselMetrics: MetricId[] = (() => {
    const heroSet = new Set<MetricId>(layout.hero);
    const ordered = [
      ...layout.secondary.filter((id) => !heroSet.has(id)),
      ...ALL_METRIC_IDS.filter(
        (id) => !heroSet.has(id) && !layout.secondary.includes(id),
      ),
    ];
    return ordered;
  })();

  const onScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    setPage(Math.round(el.scrollLeft / w));
  };

  // ---------- Hold-to-stop ----------
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);
  const holdHapticRef = useRef(false);

  const cancelHold = useCallback(() => {
    holdStartRef.current = null;
    holdHapticRef.current = false;
    if (holdRafRef.current != null) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    setHoldProgress(0);
  }, []);

  const tickHold = useCallback(() => {
    const start = holdStartRef.current;
    if (start == null) return;
    const elapsed = performance.now() - start;
    const p = Math.min(1, elapsed / STOP_HOLD_MS);
    setHoldProgress(p);
    if (p >= 0.5 && !holdHapticRef.current) {
      holdHapticRef.current = true;
      try {
        navigator.vibrate?.(30);
      } catch {
        /* noop */
      }
    }
    if (p >= 1) {
      try {
        navigator.vibrate?.([60, 40, 120]);
      } catch {
        /* noop */
      }
      cancelHold();
      onStop();
      return;
    }
    holdRafRef.current = requestAnimationFrame(tickHold);
  }, [cancelHold, onStop]);

  const beginHold = useCallback(() => {
    holdStartRef.current = performance.now();
    holdRafRef.current = requestAnimationFrame(tickHold);
  }, [tickHold]);

  useEffect(() => () => cancelHold(), [cancelHold]);

  // ---------- Ghost ----------
  const ghostDelta = tracker.ghostDeltaMs;
  const ghostActive = tracker.ghost != null && ghostDelta != null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      style={{
        height: "100dvh",
        touchAction: "none",
        overscrollBehavior: "contain",
        paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {hrSpike && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 rounded-2xl border border-destructive/50 bg-destructive/15 px-3 py-2 text-destructive">
            <Heart className="h-4 w-4 flex-shrink-0" fill="currentColor" />
            <div className="text-[11px] font-bold leading-tight">{tr("focus.hrSpike")}</div>
          </div>
        </div>
      )}
      {/* Ghost / sensor bar */}
      {(ghostActive || tracker.hrSource === "bt") && (
        <div className="px-4 pb-2 flex justify-center gap-2">
          {ghostActive && (
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border ${
                ghostDelta! >= 0
                  ? "bg-neon/15 border-neon/40 text-neon"
                  : "bg-destructive/15 border-destructive/50 text-destructive"
              }`}
            >
              <span>{ghostDelta! >= 0 ? "+" : "−"}{formatGhostDelta(ghostDelta!)}</span>
              <span className="opacity-70">
                {ghostDelta! >= 0 ? tr("focus.ahead") : tr("focus.behind")}
              </span>
            </div>
          )}
          {tracker.hrSource === "bt" && tracker.hrBpm != null && (
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border bg-white/5 border-white/15 text-foreground/90">
              <Bluetooth className="h-3 w-3 text-neon" />
              <span className="tabular-nums">{tracker.hrBpm}</span>
              <span className="opacity-60">bpm</span>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="relative mx-3 rounded-3xl overflow-hidden border border-border" style={{ flex: "1 1 0" }}>
        <RunMap
          points={tracker.points}
          className="h-full w-full"
          interactive={false}
          ghost={
            tracker.ghost
              ? { path: tracker.ghost.path, elapsedMs: tracker.elapsedMs }
              : null
          }
        />
      </div>

      {/* Spotify hub — own row below map */}
      <div className="px-3 pt-2">
        <MusicHub />
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        {layout.hero.map((id) => {
          const def = METRICS[id];
          return (
            <div key={id} className="text-center">
              <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                {tr(def.labelKey)}
              </div>
              <div className={`font-display font-black tabular-nums leading-none mt-1 text-[48px] ${id === "distance" ? "text-neon" : "text-foreground"}`}>
                {def.format(tracker)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipeable carousel — 3 stats per page */}
      <div className="px-4 pt-3">
        <div
          ref={carouselRef}
          onScroll={onScroll}
          className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory rounded-2xl bg-white/5 border border-white/10"
          style={{ scrollSnapType: "x mandatory", touchAction: "pan-x" }}
        >
          {(() => {
            const pages: MetricId[][] = [];
            for (let i = 0; i < carouselMetrics.length; i += 3) {
              pages.push(carouselMetrics.slice(i, i + 3));
            }
            return pages.map((pageMetrics, pi) => (
              <div
                key={pi}
                className="snap-center shrink-0 w-full grid grid-cols-3 gap-2 py-3 px-3"
              >
                {pageMetrics.map((id) => {
                  const def = METRICS[id];
                  const value = def.format(tracker);
                  const unit = def.unitKey ? tr(def.unitKey) : "";
                  return (
                    <div key={id} className="flex flex-col items-center text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold truncate max-w-full">
                        {tr(def.labelKey)}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="font-display font-black tabular-nums text-xl text-foreground leading-none">
                          {value}
                        </span>
                        {unit && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                            {unit}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          {Array.from({ length: Math.ceil(carouselMetrics.length / 3) }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === page ? "w-4 bg-neon" : "w-1 bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pt-3 flex items-center justify-center gap-4">
        {tracker.status === "running" ? (
          <button
            onClick={onPause}
            className="h-14 w-14 rounded-full glass-strong grid place-items-center active:scale-95"
            aria-label={tr("ctrl.pause")}
          >
            <Pause className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onResume}
            className="h-14 w-14 rounded-full bg-neon text-primary-foreground grid place-items-center active:scale-95"
            aria-label={tr("ctrl.resume")}
          >
            <Play className="h-5 w-5 ml-0.5" />
          </button>
        )}

        <button
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
          className="relative h-16 w-16 rounded-full bg-destructive text-destructive-foreground grid place-items-center active:scale-95 select-none"
          aria-label={tr("focus.holdToStop")}
          style={{ touchAction: "none" }}
        >
          {/* Progress ring */}
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden>
            <circle
              cx="32"
              cy="32"
              r="29"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="29"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 29}
              strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 29}
              strokeLinecap="round"
            />
          </svg>
          <Square className="h-5 w-5 relative" fill="currentColor" />
        </button>
      </div>

      <div className="text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold pt-1.5 pb-1">
        {tr("focus.holdToStop")}
      </div>
    </div>
  );
}
