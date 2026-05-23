import { Aperture, Satellite, Smartphone, Watch } from "lucide-react";
import type { MotionSource } from "@/lib/motion-source";
import { useI18n } from "@/lib/i18n";

type Props = {
  source: MotionSource;
  accuracyM?: number | null;
  ready?: boolean;
  className?: string;
};

const ICONS: Record<MotionSource, typeof Satellite> = {
  gps: Satellite,
  watch: Watch,
  phone: Smartphone,
  camera: Aperture,
};

const LABEL_KEY: Record<MotionSource, string> = {
  gps: "source.gps",
  watch: "source.watch",
  phone: "source.phone",
  camera: "source.camera",
};

export default function SourceSignalChip({ source, accuracyM, ready, className }: Props) {
  const { t } = useI18n();
  const Icon = ICONS[source];
  // For GPS: "ready" once we have any usable fix (accuracy known and < 100m).
  // For non-GPS sources we treat them as always ready (they are sensor-based).
  const isReady =
    source === "gps"
      ? (ready ?? (accuracyM != null && accuracyM < 100))
      : true;
  const showSearchingPulse = !isReady;
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "inline-flex items-center gap-2 px-3 h-8 rounded-full glass-strong text-[11px] font-semibold " +
        (className ?? "")
      }
    >
      <span className="relative flex h-2 w-2">
        {showSearchingPulse && (
          <span className="absolute inset-0 rounded-full bg-neon opacity-60 animate-ping" />
        )}
        <span className="relative h-2 w-2 rounded-full bg-neon" />
      </span>
      <Icon className="h-3 w-3 text-neon" />
      <span>
        {source === "gps"
          ? isReady
            ? t("gps.locked")
            : t("gps.searching")
          : t(LABEL_KEY[source])}
      </span>
      {source === "gps" && accuracyM != null && accuracyM < 999 && (
        <span className="text-muted-foreground">±{Math.round(accuracyM)}m</span>
      )}
    </div>
  );
}
