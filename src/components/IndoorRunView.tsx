import { Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import MusicHubFull from "@/components/MusicHubFull";
import SourceSignalChip from "@/components/SourceSignalChip";
import MetricPicker from "@/components/MetricPicker";
import { METRICS, type LiveStats, type MetricId } from "@/lib/stat-metrics";
import {
  DEFAULT_INDOOR_LAYOUT,
  SUPER_HERO_OPTIONS,
  loadIndoorLayout,
  saveIndoorLayout,
  type IndoorLayout,
} from "@/lib/indoor-layout";
import type { useRunTracker } from "@/hooks/use-run-tracker";

type Tracker = ReturnType<typeof useRunTracker>;

type Props = {
  tracker: Tracker;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const STOP_HOLD_MS = 1200;
const LONG_PRESS_MS = 600;

export default function IndoorRunView({ tracker, onPause, onResume, onStop }: Props) {
  const { t: tr } = useI18n();

  // -------- Layout (persisted) --------
  const [layout, setLayout] = useState<IndoorLayout>(DEFAULT_INDOOR_LAYOUT);
  useEffect(() => {
    setLayout(loadIndoorLayout());
  }, []);
  const update = useCallback((next: IndoorLayout) => {
    setLayout(next);
    saveIndoorLayout(next);
  }, []);

  // -------- Super hero (tap cycles through Pace / HR / Speed) --------
  const cycleSuperHero = () => {
    const idx = SUPER_HERO_OPTIONS.indexOf(layout.superHero);
    const next = SUPER_HERO_OPTIONS[(idx + 1) % SUPER_HERO_OPTIONS.length];
    try { navigator.vibrate?.(15); } catch { /* noop */ }
    update({ ...layout, superHero: next });
  };

  // -------- Grid carousel --------
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);
  const onCarouselScroll = () => {
    const el = carouselRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    setPage(Math.round(el.scrollLeft / w));
  };

  // -------- Metric picker (long-press on grid tile) --------
  const [picker, setPicker] = useState<{
    pageIdx: number;
    tileIdx: number;
  } | null>(null);

  const usedMetrics: MetricId[] = [
    layout.superHero,
    ...layout.gridPages.flat(),
  ];

  const handleTilePick = (id: MetricId) => {
    if (!picker) return;
    const nextPages = layout.gridPages.map((p, pi) =>
      pi === picker.pageIdx
        ? p.map((m, ti) => (ti === picker.tileIdx ? id : m))
        : p,
    );
    update({ ...layout, gridPages: nextPages });
    setPicker(null);
  };

  // -------- Hold-to-stop --------
  const [holdProgress, setHoldProgress] = useState(0);
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef = useRef<number | null>(null);

  const cancelHold = useCallback(() => {
    holdStartRef.current = null;
    if (holdRafRef.current != null) cancelAnimationFrame(holdRafRef.current);
    holdRafRef.current = null;
    setHoldProgress(0);
  }, []);

  const tick = useCallback(() => {
    const start = holdStartRef.current;
    if (start == null) return;
    const elapsed = performance.now() - start;
    const p = Math.min(1, elapsed / STOP_HOLD_MS);
    setHoldProgress(p);
    if (p >= 1) {
      try { navigator.vibrate?.([60, 40, 120]); } catch { /* noop */ }
      cancelHold();
      onStop();
      return;
    }
    holdRafRef.current = requestAnimationFrame(tick);
  }, [cancelHold, onStop]);

  const beginHold = useCallback(() => {
    holdStartRef.current = performance.now();
    holdRafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => () => cancelHold(), [cancelHold]);

  // -------- Render --------
  const superHeroDef = METRICS[layout.superHero];
  const superHeroValue = superHeroDef.format(tracker as LiveStats);
  const superHeroUnit = superHeroDef.unitKey ? tr(superHeroDef.unitKey) : "";
  const valueLen = superHeroValue.length;
  const superHeroSizeClass =
    valueLen >= 7 ? "text-[64px]" : valueLen >= 5 ? "text-[80px]" : "text-[96px]";

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-2 flex items-center justify-end">
        <SourceSignalChip source={tracker.motionSource} accuracyM={tracker.gpsAccuracyM} />
      </div>

      {/* Centered hero + grid block */}
      <div className="flex-1 flex flex-col justify-center px-4 gap-8 min-h-0">
        {/* Super hero (tap to cycle) */}
        <button
          type="button"
          onClick={cycleSuperHero}
          className="text-center w-full active:scale-[0.99] transition"
          aria-label={tr("indoor.tapToChange")}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {tr(superHeroDef.labelKey)}
            {superHeroUnit ? ` · ${superHeroUnit.toUpperCase()}` : ""}
          </div>
          <div className={`font-display font-black tabular-nums text-neon leading-none mt-3 ${superHeroSizeClass}`}>
            {superHeroValue}
          </div>
          <div className="mt-2 text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
            {tr("indoor.tapToChange")}
          </div>
        </button>

        {/* Swipable 2x2 grid */}
        <div>
          <div
            ref={carouselRef}
            onScroll={onCarouselScroll}
            className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory"
            style={{ scrollSnapType: "x mandatory", touchAction: "pan-x" }}
          >
            {layout.gridPages.map((pageMetrics, pi) => (
              <div
                key={pi}
                className="snap-center shrink-0 w-full grid grid-cols-2 grid-rows-2 gap-3"
              >
                {pageMetrics.map((id, ti) => (
                  <GridTile
                    key={`${pi}-${ti}-${id}`}
                    metricId={id}
                    stats={tracker as LiveStats}
                    onLongPress={() => setPicker({ pageIdx: pi, tileIdx: ti })}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-1 mt-3">
            {layout.gridPages.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === page ? "w-4 bg-neon" : "w-1 bg-white/25"
                }`}
              />
            ))}
          </div>
          <div className="text-center mt-1.5 text-[9px] uppercase tracking-[0.25em] text-muted-foreground/60 font-bold">
            {tr("indoor.holdToCustomize")}
          </div>
        </div>
      </div>

      <div className="px-3 pt-2">
        <MusicHubFull />
      </div>

      {/* Controls */}
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
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" aria-hidden>
            <circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <circle
              cx="32" cy="32" r="29"
              fill="none" stroke="white" strokeWidth="3"
              strokeDasharray={2 * Math.PI * 29}
              strokeDashoffset={(1 - holdProgress) * 2 * Math.PI * 29}
              strokeLinecap="round"
            />
          </svg>
          <Square className="h-5 w-5 relative" fill="currentColor" />
        </button>
      </div>
      <div className="text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold pt-1 pb-2">
        {tr("focus.holdToStop")}
      </div>

      <MetricPicker
        open={picker != null}
        current={
          picker
            ? layout.gridPages[picker.pageIdx][picker.tileIdx]
            : null
        }
        used={usedMetrics}
        onSelect={handleTilePick}
        onOpenChange={(o) => {
          if (!o) setPicker(null);
        }}
      />
    </div>
  );
}

// ---------- Grid tile ----------

function GridTile({
  metricId,
  stats,
  onLongPress,
}: {
  metricId: MetricId;
  stats: LiveStats;
  onLongPress: () => void;
}) {
  const { t: tr } = useI18n();
  const def = METRICS[metricId];
  const value = def.format(stats);
  const unit = def.unitKey ? tr(def.unitKey) : "";

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = () => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      try { navigator.vibrate?.(40); } catch { /* noop */ }
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const valueLen = value.length + (unit ? unit.length + 1 : 0);
  const valueSize =
    valueLen >= 10 ? "text-xl" : valueLen >= 8 ? "text-2xl" : "text-3xl";

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center active:scale-[0.98] transition select-none"
      style={{ touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none" }}
      aria-label={`${tr(def.labelKey)} ${value}`}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
        {tr(def.labelKey)}
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className={`font-display font-black tabular-nums ${valueSize} text-foreground leading-none`}>
          {value}
        </span>
        {unit && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {unit}
          </span>
        )}
      </div>
    </button>
  );
}
