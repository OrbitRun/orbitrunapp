import { ArrowDown, ArrowUp, Check, Target } from "lucide-react";
import { ZONE_VAR, type HrZoneId } from "@/lib/hr-zones-config";
import { formatPace } from "@/lib/run-utils";
import {
  paceStatus,
  targetForZone,
  type PaceStatus,
  type ZonePacingConfig,
} from "@/lib/zone-pacing";
import { useI18n } from "@/lib/i18n";

type Props = {
  zone: HrZoneId;
  currentPaceSecPerKm: number;
  cfg: ZonePacingConfig;
};

export default function ZonePacingChip({ zone, currentPaceSecPerKm, cfg }: Props) {
  const { t } = useI18n();
  const target = targetForZone(zone, cfg);
  const status: PaceStatus = paceStatus(currentPaceSecPerKm, target);
  const color = ZONE_VAR[zone];

  const Icon = status === "too-fast" ? ArrowDown : status === "too-slow" ? ArrowUp : Check;
  const label =
    status === "too-fast"
      ? t("pacing.tooFast")
      : status === "too-slow"
        ? t("pacing.tooSlow")
        : t("pacing.onTarget");

  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] border bg-white/5"
      style={{
        borderColor: color,
        color,
      }}
    >
      <Target className="h-3 w-3" style={{ color }} />
      <span className="tabular-nums">
        {formatPace(target.lower)}–{formatPace(target.upper)}
      </span>
      <span className="opacity-70">/km</span>
      <Icon className="h-3 w-3 ml-1" />
      <span className="opacity-90">{label}</span>
    </div>
  );
}
