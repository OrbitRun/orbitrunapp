import { useI18n } from "@/lib/i18n";
import type { HrSample } from "@/lib/run-types";
import { timeInZones } from "@/lib/hr-zones";

type Props = { series?: HrSample[]; maxHr?: number };

// Zone color ramp: cool → hot. Uses arbitrary hsl tokens kept inline so the
// chart stays self-contained; aligns with neon (Z3) and destructive (Z5).
const ZONE_COLOR: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "oklch(0.78 0.10 230)", // cool blue
  2: "oklch(0.82 0.13 200)", // teal
  3: "oklch(0.92 0.21 130)", // neon
  4: "oklch(0.80 0.20 70)", // amber
  5: "oklch(0.65 0.25 25)", // hot red
};

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

      {/* Stacked bar */}
      <div className="mt-3 h-3 w-full rounded-full overflow-hidden flex bg-white/5">
        {slices.map((sl) => (
          <div
            key={sl.zone}
            style={{
              width: `${sl.pct}%`,
              backgroundColor: ZONE_COLOR[sl.zone],
            }}
            className="h-full transition-all"
            aria-label={`Zone ${sl.zone}: ${sl.pct}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <ul className="mt-3 space-y-1.5">
        {slices.map((sl) => (
          <li
            key={sl.zone}
            className="flex items-center gap-3 text-[11px] tabular text-foreground"
          >
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: ZONE_COLOR[sl.zone] }}
            />
            <span className="w-8 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">
              Z{sl.zone}
            </span>
            <span className="flex-1 text-muted-foreground">{t(`zones.z${sl.zone}`)}</span>
            <span className="w-12 text-right font-bold">{sl.pct.toFixed(0)}%</span>
            <span className="w-12 text-right font-mono text-muted-foreground">{fmtMs(sl.ms)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
