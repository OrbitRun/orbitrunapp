import { Satellite } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Props = {
  accuracyM: number | null;
  className?: string;
};

export default function GpsSignalChip({ accuracyM, className }: Props) {
  const { t } = useI18n();
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
        <span className="absolute inset-0 rounded-full bg-neon opacity-60 animate-ping" />
        <span className="relative h-2 w-2 rounded-full bg-neon" />
      </span>
      <Satellite className="h-3 w-3 text-neon" />
      <span>{t("gps.searching")}</span>
      {accuracyM != null && accuracyM < 999 && (
        <span className="text-muted-foreground">±{Math.round(accuracyM)}m</span>
      )}
    </div>
  );
}
