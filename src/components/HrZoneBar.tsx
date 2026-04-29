import { useI18n } from "@/lib/i18n";
import type { HrSample } from "@/lib/run-types";
import { timeInZones } from "@/lib/hr-zones";
import { ZONE_VAR, type HrZoneId } from "@/lib/hr-zones-config";
import HrZoneDonut from "@/components/HrZoneDonut";

type Props = { series?: HrSample[]; maxHr?: number };

function fmtMs(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function HrZoneBar({ series, maxHr }: Props) {
  const { t } = useI18n();
  if (!series || series.length < 2) return null;
  const slices = timeInZones(series, maxHr);
  const totalMs = slices.reduce((a, b) => a + b.ms, 0);
  if (totalMs <= 0) return null;

  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("zones.title")}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold tabular">
          {fmtMs(totalMs)}
        </div>
      </div>

      {/* Donut + legend side-by-side */}
      <div className="mt-3 flex items-center gap-4">
        <HrZoneDonut slices={slices} size={108} />
        <ul className="flex-1 space-y-1.5">
          {slices.map((sl) => (
            <li
              key={sl.zone}
              className="flex items-center gap-2 text-[11px] tabular text-foreground"
            >
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: ZONE_VAR[sl.zone as HrZoneId] }}
              />
              <span className="w-7 text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                Z{sl.zone}
              </span>
              <span className="flex-1 text-muted-foreground truncate">{t(`zones.z${sl.zone}`)}</span>
              <span className="w-9 text-right font-bold">{sl.pct.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stacked bar */}
      <div className="mt-4 h-3 w-full rounded-full overflow-hidden flex bg-white/5">
        {slices.map((sl) => (
          <div
            key={sl.zone}
            style={{
              width: `${sl.pct}%`,
              backgroundColor: ZONE_VAR[sl.zone as HrZoneId],
            }}
            className="h-full transition-all"
            aria-label={`Zone ${sl.zone}: ${sl.pct}%`}
          />
        ))}
      </div>
    </section>
  );
}
