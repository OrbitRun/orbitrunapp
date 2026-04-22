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

const LONG_PRESS_MS = 2000;

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
  const valueClass = isHero
    ? "font-display font-black tabular text-[44px] leading-none"
    : "font-display font-black tabular text-xl leading-none";

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full text-left ${
        isHero ? "glass-strong rounded-3xl p-5" : "glass rounded-2xl p-4"
      } transition active:scale-[0.98] ${
        glow ? "ring-1 ring-[var(--neon)]/40 shadow-[0_0_24px_oklch(0.92_0.21_130/0.18)]" : ""
      } ${editMode ? "ring-2 ring-neon/70 animate-pulse" : ""}`}
      aria-label={`${t(def.labelKey)} ${value}`}
      style={{ touchAction: "manipulation", WebkitUserSelect: "none", userSelect: "none" }}
    >
      {editMode && (
        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-neon text-primary-foreground grid place-items-center shadow-neon">
          <Pencil className="h-3 w-3" />
        </span>
      )}
      <div
        className={`text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ${
          isHero ? "text-center" : ""
        }`}
      >
        {t(def.labelKey)}
      </div>
      <div
        className={`mt-1 flex items-baseline gap-1.5 ${isHero ? "justify-center" : ""}`}
      >
        <span
          className={`${valueClass} ${
            accent || glow || (isHero && metricId === "distance") ? "text-neon" : "text-foreground"
          } ${glow ? "glow-neon" : ""}`}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground font-bold">{unit}</span>}
      </div>
    </button>
  );
}
