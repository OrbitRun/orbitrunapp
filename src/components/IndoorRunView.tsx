import { Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import MusicHubFull from "@/components/MusicHubFull";
import SourceSignalChip from "@/components/SourceSignalChip";
import type { useRunTracker } from "@/hooks/use-run-tracker";

type Tracker = ReturnType<typeof useRunTracker>;

type Props = {
  tracker: Tracker;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
};

const STOP_HOLD_MS = 1200;

export default function IndoorRunView({ tracker, onPause, onResume, onStop }: Props) {
  const { t: tr } = useI18n();
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

  const pace = tracker.currentPaceSecPerKm > 0
    ? formatPace(tracker.currentPaceSecPerKm)
    : tracker.avgPaceSecPerKm > 0
      ? formatPace(tracker.avgPaceSecPerKm)
      : "—:—";

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-2 flex items-center justify-end">
        <SourceSignalChip source={tracker.motionSource} accuracyM={tracker.gpsAccuracyM} />
      </div>

      {/* Super hero: pace */}
      <div className="px-4 pt-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {tr("stat.pace")} · {tr("unit.minPerKm")}
        </div>
        <div className="font-display font-black tabular-nums text-neon leading-none mt-2 text-[96px]">
          {pace}
        </div>
      </div>

      {/* 2x2 grid: HR, Distance, Time, Cadence */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-6">
        <Tile
          label={tr("stat.hr")}
          unit="BPM"
          value={tracker.hrBpm != null ? String(tracker.hrBpm) : "—"}
        />
        <Tile
          label={tr("stat.distance")}
          unit="KM"
          value={formatDistance(tracker.distanceM)}
        />
        <Tile
          label={tr("stat.duration")}
          unit=""
          value={formatDuration(tracker.elapsedMs)}
        />
        <Tile
          label={tr("stat.cadence")}
          unit="SPM"
          value={String(tracker.cadenceSpm || 0)}
        />
      </div>

      <div className="px-3 pt-4">
        <MusicHubFull />
      </div>

      {/* Controls */}
      <div className="mt-auto px-4 pt-4 pb-2 flex items-center justify-center gap-4">
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
      <div className="text-center text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold pb-2">
        {tr("focus.holdToStop")}
      </div>
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-1">
        <span className="font-display font-black tabular-nums text-3xl text-neon leading-none">
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
}
