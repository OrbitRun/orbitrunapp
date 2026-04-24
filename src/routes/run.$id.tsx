import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import { RunningShoeIcon } from "@/components/icons/RunningShoeIcon";
import { loadRuns, updateRun, type Run, type RunWeather } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import RunMap from "@/components/RunMap";
import StatTile from "@/components/StatTile";
import WeatherBadge from "@/components/WeatherBadge";
import WeatherEditor from "@/components/WeatherEditor";
import ShoePicker from "@/components/ShoePicker";
import { getShoeById, reassignRunDistance } from "@/lib/shoes";
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
  const [editingWeather, setEditingWeather] = useState(false);
  const [pickingShoe, setPickingShoe] = useState(false);
  const { t } = useI18n();

  const handleWeatherSave = (w: RunWeather) => {
    if (!run) return;
    const updated = updateRun(run.id, { weather: w });
    if (updated) setRun(updated);
    setEditingWeather(false);
  };

  const handleShoeSelect = (newShoeId: string | null) => {
    if (!run) return;
    const oldId = run.shoeId;
    const nextId = newShoeId ?? undefined;
    if (oldId === nextId) {
      setPickingShoe(false);
      return;
    }
    reassignRunDistance(oldId, nextId, run.distanceM);
    const updated = updateRun(run.id, { shoeId: nextId });
    if (updated) setRun(updated);
    try {
      window.dispatchEvent(new Event("orbit:shoes-updated"));
    } catch {
      /* noop */
    }
    setPickingShoe(false);
  };

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

      <section className="rounded-3xl overflow-hidden border border-border shadow-card relative">
        <RunMap points={run.points} className="h-[280px] w-full" interactive={true} follow={false} />
        {run.weather && (
          <div className="absolute top-3 left-3">
            <WeatherBadge weather={run.weather} />
          </div>
        )}
      </section>

      <div className="mt-2 flex justify-end px-1">
        <button
          onClick={() => setEditingWeather((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground active:scale-95 transition"
        >
          <Pencil className="h-3 w-3" />
          {run.weather ? t("weather.edit.toggle") : t("weather.edit.add")}
        </button>
      </div>

      {editingWeather && (
        <WeatherEditor
          initial={run.weather}
          onSave={handleWeatherSave}
          onCancel={() => setEditingWeather(false)}
        />
      )}

      {/* Shoe row — tap to change */}
      <button
        type="button"
        onClick={() => setPickingShoe(true)}
        className="mt-3 w-full flex items-center gap-3 p-3 rounded-2xl glass active:scale-[0.99] transition text-left"
        aria-label={t("run.shoe.change")}
      >
        <RunningShoeIcon className="h-4 w-4 text-neon flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            {t("run.shoe.label")}
          </div>
          {(() => {
            const shoe = getShoeById(run.shoeId);
            return (
              <div className="text-sm font-bold truncate mt-0.5">
                {shoe ? `${shoe.brand} ${shoe.model}` : t("run.shoe.none")}
              </div>
            );
          })()}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      <ShoePicker
        open={pickingShoe}
        onOpenChange={setPickingShoe}
        currentShoeId={run.shoeId}
        onSelect={handleShoeSelect}
      />

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
