import { useEffect, useState } from "react";
import { Activity, Heart, TrendingDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Run } from "@/lib/run-types";
import { loadRuns } from "@/lib/run-types";
import { aerobicEfficiency, classifyHrr } from "@/lib/hr-analysis";
import { classifyFitness, estimateVo2Max } from "@/lib/vo2max";

type Props = { run: Run };

// Renders post-run heart-rate insights:
// 1. Heart-rate recovery (BPM drop in first 60s after stop) — backfills via
//    `orbit:run-updated` once the tracker finishes its 75s capture window.
// 2. Aerobic efficiency callout — same pace, lower HR than recent baseline.
export default function BioInsightCard({ run }: Props) {
  const { t } = useI18n();
  const [hrr, setHrr] = useState<number | undefined>(run.hrrDrop60s);

  useEffect(() => {
    setHrr(run.hrrDrop60s);
    const onUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<{ runId?: string; hrrDrop60s?: number }>).detail;
      if (detail?.runId !== run.id) return;
      if (typeof detail.hrrDrop60s === "number") setHrr(detail.hrrDrop60s);
    };
    window.addEventListener("orbit:run-updated", onUpdate);
    return () => window.removeEventListener("orbit:run-updated", onUpdate);
  }, [run.id, run.hrrDrop60s]);

  const aero = aerobicEfficiency(run, loadRuns());
  if (hrr == null && !aero) return null;

  const hrrInsight = hrr != null ? classifyHrr(hrr) : null;
  const tone =
    hrrInsight?.key === "hrr.strong"
      ? "text-neon"
      : hrrInsight?.key === "hrr.weak"
        ? "text-destructive"
        : "text-foreground";

  return (
    <section className="mt-3 space-y-2">
      {hrrInsight && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              {t("hrr.eyebrow")}
            </div>
            <div className={`font-display font-black tabular text-base leading-none ${tone}`}>
              −{hrrInsight.drop}
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
                {t("hrr.unit")}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground leading-snug">
            <Heart className={`h-3.5 w-3.5 flex-shrink-0 ${tone}`} />
            <span>{t(hrrInsight.key)}</span>
          </div>
        </div>
      )}
      {aero && (
        <div className="rounded-2xl border border-neon/30 bg-neon/[0.06] p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold">
              {t("aero.title")}
            </div>
            <div className="font-display font-black tabular text-base leading-none text-neon">
              −{aero.bpmDelta}
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
                bpm
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-foreground leading-snug">
            <TrendingDown className="h-3.5 w-3.5 flex-shrink-0 text-neon" />
            <span>{t("aero.body", { delta: aero.bpmDelta })}</span>
          </div>
        </div>
      )}
    </section>
  );
}
