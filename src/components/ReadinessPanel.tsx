import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ChevronRight, Heart, Thermometer, Wind } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadRuns, type Run } from "@/lib/run-types";
import { useVitals } from "@/hooks/use-vitals";
import { useHrZones } from "@/hooks/use-hr-zones";
import { useCurrentEnv } from "@/hooks/use-current-env";
import { computeReadiness } from "@/lib/readiness-engine";

export default function ReadinessPanel() {
  const { t } = useI18n();
  const [runs, setRuns] = useState<Run[]>([]);
  const [mounted, setMounted] = useState(false);
  const vitals = useVitals();
  const hrZones = useHrZones();
  const env = useCurrentEnv();

  useEffect(() => {
    setMounted(true);
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

  return (
    <section className="mt-1 mb-3 glass rounded-2xl p-4">
      <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-muted-foreground mb-3">
        {t("readiness.title")}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          icon={<Heart className="h-3 w-3" />}
          label={t("readiness.metric.restingHr")}
          value={mounted && vitals.restingHr ? String(vitals.restingHr) : "—"}
          unit={mounted && vitals.restingHr ? t("readiness.unit.bpm") : ""}
        />
        <MiniStat
          icon={<Activity className="h-3 w-3" />}
          label={t("readiness.metric.hrv")}
          value={mounted && vitals.hrvMs ? String(vitals.hrvMs) : "—"}
          unit={mounted && vitals.hrvMs ? t("readiness.unit.ms") : ""}
        />
        <MiniStat
          icon={<Activity className="h-3 w-3" />}
          label={t("readiness.metric.trimp7d")}
          value={mounted ? String(r.trimp7d) : "—"}
          unit={
            mounted && r.loadTrendPct !== 0
              ? `${r.loadTrendPct > 0 ? "+" : ""}${r.loadTrendPct}%`
              : ""
          }
        />
        <MiniStat
          icon={<Thermometer className="h-3 w-3" />}
          label={t("readiness.metric.weather")}
          value={mounted && env ? `${env.apparentTempC}°` : "—"}
          unit={mounted && env ? `${env.humidityPct}%` : ""}
          extra={
            mounted && env && env.windMs >= 5 ? (
              <Wind className="h-3 w-3 text-muted-foreground" />
            ) : null
          }
        />
      </div>

      {mounted && (r.missingVitals || hrZones?.source !== "manual") && (
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
