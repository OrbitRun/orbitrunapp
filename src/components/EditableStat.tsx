import { useRef } from "react";
import { Pencil } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { METRICS, type LiveStats, type MetricId } from "@/lib/stat-metrics";

type Variant = "hero" | "secondary";

type Props = {
  metricId: MetricId;
  stats: LiveStats;
  variant: Variant;
  editMode: boolean;
  onLongPress: () => void;
  onTap: () => void;
  glow?: boolean;
  accent?: boolean;
};

const LONG_PRESS_MS = 1000;

export default function EditableStat({
  metricId,
  stats,
  variant,
  editMode,
  onLongPress,
  onTap,
  glow,
  accent,
}: Props) {
  const { t } = useI18n();
  const def = METRICS[metricId];
  const value = def.format(stats);
  const unit = def.unitKey ? t(def.unitKey) : undefined;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggeredRef = useRef(false);

  const start = () => {
    triggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      triggeredRef.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(40);
        } catch {
          /* noop */
        }
      }
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const release = () => {
    const wasLong = triggeredRef.current;
    cancel();
    if (!wasLong && editMode) onTap();
  };

  const isHero = variant === "hero";

  // Auto-shrink hero value so it always fits on one line within the tile.
  const valueLen = value.length;
  const heroValueSize =
    valueLen >= 8
      ? "text-[26px]"
      : valueLen >= 7
        ? "text-[30px]"
        : valueLen >= 5
          ? "text-[36px]"
          : "text-[44px]";

  // Auto-shrink secondary value+unit if combined string is long, to keep on one line.
  const combinedLen = value.length + (unit ? unit.length + 1 : 0);
  const secondaryValueSize =
    combinedLen >= 12
      ? "text-xs"
      : combinedLen >= 10
        ? "text-sm"
        : combinedLen >= 9
          ? "text-base"
          : "text-lg";
  const secondaryUnitSize = combinedLen >= 11 ? "text-[9px]" : "text-[10px]";

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full text-left overflow-hidden ${
        isHero
          ? "glass-strong rounded-[28px] p-5"
          : "glass-strong rounded-[28px] px-2 py-2 h-[58px] flex flex-col items-center justify-center gap-0.5"
      } transition active:scale-[0.98] ${
        glow ? "ring-1 ring-[var(--neon)]/40 shadow-[0_0_24px_oklch(0.92_0.21_130/0.18)]" : ""
      } ${editMode ? "ring-2 ring-neon/70 animate-pulse" : ""}`}
      aria-label={`${t(def.labelKey)} ${value}`}
      style={{ touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none" }}
    >
      {editMode && (
        <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-neon text-primary-foreground grid place-items-center shadow-neon">
          <Pencil className="h-2.5 w-2.5" />
        </span>
      )}
      {isHero ? (
        <>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold text-center">
            {t(def.labelKey)}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5 justify-center whitespace-nowrap min-w-0 px-1">
            <span
              className={`font-display font-black tabular leading-none ${heroValueSize} ${
                accent || glow || metricId === "distance" ? "text-neon" : "text-foreground"
              } ${glow ? "glow-neon" : ""}`}
            >
              {value}
            </span>
            {unit && <span className="text-xs text-muted-foreground font-bold">{unit}</span>}
          </div>
        </>
      ) : (
        <>
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold text-center leading-none mb-0.5">
            {t(def.labelKey)}
          </div>
          <div className="flex items-baseline justify-center gap-1 whitespace-nowrap w-full px-1 overflow-hidden">
            <span
              className={`font-display font-black tabular ${secondaryValueSize} leading-none ${
                accent || glow ? "text-neon" : "text-foreground"
              } ${glow ? "glow-neon" : ""}`}
            >
              {value}
            </span>
            {unit && (
              <span className={`${secondaryUnitSize} text-muted-foreground font-bold leading-none`}>
                {unit}
              </span>
            )}
          </div>
        </>
      )}
    </button>
  );
}
