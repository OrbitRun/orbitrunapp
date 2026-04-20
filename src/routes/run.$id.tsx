import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { loadRuns, type Run } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import RunMap from "@/components/RunMap";
import StatTile from "@/components/StatTile";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/run/$id")({
  component: RunDetailPage,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <p className="text-muted-foreground">Run not found.</p>
        <Link to="/history" className="text-neon font-semibold mt-3 inline-block">
          Back to history
        </Link>
      </div>
    </div>
  ),
});

function RunDetailPage() {
  const { id } = useParams({ from: "/run/$id" });
  const [run, setRun] = useState<Run | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    setRun(loadRuns().find((r) => r.id === id) ?? null);
    setLoaded(true);
  }, [id]);

  if (loaded && !run) {
    return (
      <main className="mx-auto max-w-md px-4 pt-6">
        <Link to="/history" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("history.back")}
        </Link>
        <div className="mt-10 glass rounded-2xl p-6 text-center text-muted-foreground">
          Run not found.
        </div>
      </main>
    );
  }
  if (!run) return null;

  const max = Math.max(...run.splits.map((x) => x.paceSecPerKm), 0);
  const min = Math.min(...run.splits.map((x) => x.paceSecPerKm), max);
  const range = Math.max(1, max - min);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3 flex items-center justify-between">
        <Link to="/history" className="h-9 w-9 grid place-items-center rounded-full glass" aria-label={t("history.back")}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {formatDate(run.startedAt)}
        </div>
        <div className="w-9" />
      </header>

      <section className="rounded-3xl overflow-hidden border border-border shadow-card">
        <RunMap points={run.points} className="h-[280px] w-full" interactive={true} follow={false} />
      </section>

      <section className="mt-4 glass-strong rounded-3xl p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("stat.distance")}
        </div>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span className="font-display font-black tabular text-[64px] leading-none text-neon">
            {formatDistance(run.distanceM)}
          </span>
          <span className="text-sm text-muted-foreground font-semibold">{t("unit.km")}</span>
        </div>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatTile label={t("stat.duration")} value={formatDuration(run.durationMs)} />
        <StatTile label={t("stat.avgPace")} value={formatPace(run.avgPaceSecPerKm)} unit={t("unit.perKm")} />
        <StatTile label={t("stat.cadence")} value={String(run.avgCadenceSpm)} unit={t("unit.spm")} />
        <StatTile label={t("stat.elevation")} value={Math.round(run.elevationGainM).toString()} unit={t("unit.m")} />
      </section>

      {run.splits.length > 0 && (
        <section className="mt-4 glass rounded-2xl p-4">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold pb-3">
            {t("splits.title")}
          </div>
          <ul className="space-y-2">
            {run.splits.map((s) => {
              const pct = 100 - ((s.paceSecPerKm - min) / range) * 70;
              return (
                <li key={s.km} className="flex items-center gap-3">
                  <span className="w-10 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    {t("splits.km")} {s.km}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-neon rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-mono text-sm font-bold w-14 text-right">
                    {formatPace(s.paceSecPerKm)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="h-6" />
    </main>
  );
}
