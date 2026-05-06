import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ChevronRight, Heart, Sparkles, Thermometer, Wind } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadRuns, type Run } from "@/lib/run-types";
import { useVitals } from "@/hooks/use-vitals";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useCurrentEnv } from "@/hooks/use-current-env";
import { computeReadiness, type ReadinessResult } from "@/lib/readiness-engine";
import InfoHint from "@/components/InfoHint";

function bandColor(band: ReadinessResult["band"]): string {
  switch (band) {
    case "rest":
      return "var(--destructive)";
    case "easy":
      return "oklch(0.78 0.18 60)"; // amber
    case "ready":
      return "var(--neon)";
    case "prime":
      return "var(--neon)";
  }
}

export default function ReadinessPanel() {
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
  const bandLabel = t(`readiness.band.${r.band}`);
  const recommendation = t(r.recommendationKey, r.recommendationParams as Record<string, string>);

  return (
    <section
      className="mt-1 mb-3 glass rounded-2xl p-4"
      style={{ borderColor: "color-mix(in oklab, " + color + " 35%, transparent)" }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color }}>
          {t("readiness.title")}
        </div>
        <div className="font-display font-black tabular leading-none">
          <span className="text-2xl" style={{ color }}>{r.score}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
            {t("readiness.score.of")}
          </span>
        </div>
      </div>

      <div
        className="mt-2 h-[3px] w-full bg-white/5 overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={r.score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${r.score}%`, backgroundColor: color }}
        />
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" style={{ color }} />
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold" style={{ color }}>
          {bandLabel}
        </span>
      </div>

      <p className="mt-2 text-[12px] leading-snug text-foreground">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold mr-1">
          {t("readiness.coach")}:
        </span>
        {recommendation}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat
          icon={<Heart className="h-3 w-3" />}
          label={t("readiness.metric.restingHr")}
          value={vitals.restingHr ? String(vitals.restingHr) : "—"}
          unit={vitals.restingHr ? t("readiness.unit.bpm") : ""}
        />
        <MiniStat
          icon={<Activity className="h-3 w-3" />}
          label={t("readiness.metric.hrv")}
          value={vitals.hrvMs ? String(vitals.hrvMs) : "—"}
          unit={vitals.hrvMs ? t("readiness.unit.ms") : ""}
        />
        <MiniStat
          icon={<Activity className="h-3 w-3" />}
          label={t("readiness.metric.trimp7d")}
          value={String(r.trimp7d)}
          unit={
            r.loadTrendPct !== 0
              ? `${r.loadTrendPct > 0 ? "+" : ""}${r.loadTrendPct}%`
              : ""
          }
        />
        <MiniStat
          icon={<Thermometer className="h-3 w-3" />}
          label={t("readiness.metric.weather")}
          value={env ? `${env.apparentTempC}°` : "—"}
          unit={env ? `${env.humidityPct}%` : ""}
          extra={env && env.windMs >= 5 ? <Wind className="h-3 w-3 text-muted-foreground" /> : null}
        />
      </div>

      {(r.missingVitals || hrZones?.source !== "manual") && (
        <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
          {r.missingVitals && (
            <Link
              to="/profile/heart-rate"
              className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] font-bold text-neon hover:text-foreground"
            >
              <span>{t("readiness.cta.logVitals")}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
          {hrZones?.source !== "manual" && (
            <Link
              to="/profile/heart-rate"
              className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground hover:text-foreground"
            >
              <span>{t("readiness.cta.personalize")}</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

function MiniStat({
  icon,
  label,
  value,
  unit,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[9px] uppercase tracking-[0.18em] font-bold truncate">{label}</span>
        {extra}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="font-display font-black tabular text-base text-foreground leading-none">
          {value}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground font-bold">{unit}</span>}
      </div>
    </div>
  );
}
