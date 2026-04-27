import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Square } from "lucide-react";
import RunMap from "@/components/RunMap";
import { useI18n } from "@/lib/i18n";
import {
  ALL_METRIC_IDS,
  METRICS,
  type MetricId,
  type StatLayout,
} from "@/lib/stat-metrics";
import type { useRunTracker } from "@/hooks/use-run-tracker";

type Tracker = ReturnType<typeof useRunTracker>;

type Props = {
  tracker: Tracker;
  layout: StatLayout;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const STOP_HOLD_MS = 1200;

const MOCK_TRACKS = [
  { title: "Midnight Pulse", artist: "Neon Drift" },
  { title: "Orbit Run", artist: "Synth Capsule" },
  { title: "Lime Horizon", artist: "After Hours" },
];

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

  // ---------- Carousel ----------
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

  // ---------- Mini music ----------
  const [musicIdx, setMusicIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const track = MOCK_TRACKS[musicIdx];

  // ---------- Ghost ----------
  const ghostDelta = tracker.ghostDeltaMs;
  const ghostActive = tracker.ghost != null && ghostDelta != null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-background"
      style={{
        height: "100dvh",
        touchAction: "none",
        overscrollBehavior: "contain",
        paddingTop: "max(env(safe-area-inset-top), 0.5rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
      }}
    >
      {/* Ghost bar */}
      {ghostActive && (
        <div className="px-4 pb-2 flex justify-center">
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
        {/* Mini music overlay */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full glass-strong px-1.5 py-1 max-w-[80%]">
          <button
            aria-label="Previous track"
            onClick={() =>
              setMusicIdx((i) => (i - 1 + MOCK_TRACKS.length) % MOCK_TRACKS.length)
            }
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/10"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label={playing ? "Pause music" : "Play music"}
            onClick={() => setPlaying((p) => !p)}
            className="h-8 w-8 grid place-items-center rounded-full bg-neon text-primary-foreground active:scale-95"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
          </button>
          <button
            aria-label="Next track"
            onClick={() => setMusicIdx((i) => (i + 1) % MOCK_TRACKS.length)}
            className="h-7 w-7 grid place-items-center rounded-full hover:bg-white/10"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>
          <div className="hidden xs:block text-[10px] font-semibold truncate pl-1 pr-2 text-foreground/80 max-w-[120px]">
            {track.title}
          </div>
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3">
        {layout.hero.map((id) => {
          const def = METRICS[id];
          return (
            <div key={id} className="text-center">
              <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
                {tr(def.labelKey)}
              </div>
              <div className="font-display font-black tabular-nums leading-none mt-1 text-[44px] text-foreground">
                {def.format(tracker)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Swipeable carousel */}
      <div className="px-4 pt-3">
        <div
          ref={carouselRef}
          onScroll={onScroll}
          className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory rounded-2xl bg-white/5 border border-white/10"
          style={{ scrollSnapType: "x mandatory", touchAction: "pan-x" }}
        >
          {carouselMetrics.map((id) => {
            const def = METRICS[id];
            const value = def.format(tracker);
            const unit = def.unitKey ? tr(def.unitKey) : "";
            return (
              <div
                key={id}
                className="snap-center shrink-0 w-full flex flex-col items-center justify-center py-3 px-4"
              >
                <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
                  {tr(def.labelKey)}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display font-black tabular-nums text-[28px] text-foreground leading-none">
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
        <div className="flex items-center justify-center gap-1 mt-2">
          {carouselMetrics.map((_, i) => (
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
