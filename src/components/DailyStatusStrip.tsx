import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadRuns, type Run } from "@/lib/run-types";
import { useVitals } from "@/hooks/use-vitals";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useCurrentEnv } from "@/hooks/use-current-env";
import { computeReadiness, type ReadinessResult } from "@/lib/readiness-engine";

function bandColor(band: ReadinessResult["band"]): string {
  switch (band) {
    case "rest":
      return "var(--destructive)";
    case "easy":
      return "oklch(0.78 0.18 60)";
    case "ready":
    case "prime":
      return "var(--neon)";
  }
}

export default function DailyStatusStrip() {
  const { t } = useI18n();
  const [runs, setRuns] = useState<Run[]>([]);
  const vitals = useVitals();
  const hrZones = useHrZones();
  const env = useCurrentEnv();

  useEffect(() => {
    setRuns(loadRuns());
    const onUpdate = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", onUpdate);
    window.addEventListener("orbit:run-stop", onUpdate);
    return () => {
      window.removeEventListener("orbit:run-updated", onUpdate);
      window.removeEventListener("orbit:run-stop", onUpdate);
    };
  }, []);

  const r = useMemo(
    () => computeReadiness({ runs, vitals, hrZones, env }),
    [runs, vitals, hrZones, env],
  );
  const color = bandColor(r.band);
  const recommendation = t(r.recommendationKey, r.recommendationParams as Record<string, string>)
    .replace(/^Score\s+\d+\/100\.\s*/i, "");

  return (
    <Link
      to="/coach"
      className="mt-1 mb-3 glass rounded-2xl px-3 py-2 flex items-center gap-3 active:scale-[0.99] transition"
      style={{ borderColor: "color-mix(in oklab, " + color + " 35%, transparent)" }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-[0.22em] font-bold leading-none" style={{ color }}>
          {t("dailyStatus.eyebrow")}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="font-display font-black tabular text-sm leading-none" style={{ color }}>
            {r.score}
            <span className="text-[9px] text-muted-foreground font-bold ml-0.5">/100</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-bold leading-none whitespace-nowrap">
            {t(`readiness.band.${r.band}`)}
          </span>
        </div>
        <div className="mt-1 text-[10px] leading-snug text-foreground/80">
          {recommendation}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </Link>
  );
}
