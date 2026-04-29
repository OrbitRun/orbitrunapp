import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Footprints, Pencil, Share2, Trophy } from "lucide-react";
import { loadRuns, updateRun, type Run, type RunWeather } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import RunMap from "@/components/RunMap";
import StatTile from "@/components/StatTile";
import WeatherBadge from "@/components/WeatherBadge";
import WeatherEditor from "@/components/WeatherEditor";
import ShoePicker from "@/components/ShoePicker";
import ShareSheet from "@/components/ShareSheet";
import BioInsightCard from "@/components/BioInsightCard";
import { getShoeById, reassignRunDistance } from "@/lib/shoes";
import { useI18n } from "@/lib/i18n";
import { ALL_METRIC_IDS, METRICS, computeRunMetrics } from "@/lib/stat-metrics";
import { bestTimeForPoints, loadPrs, PR_ORDER, type PrCategory } from "@/lib/personal-records";

export const Route = createFileRoute("/run/$id")({
  component: RunDetailPage,
  notFoundComponent: NotFound,
});

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="text-center">
        <p className="text-muted-foreground">{t("run.notFound")}</p>
        <Link to="/history" className="text-neon font-semibold mt-3 inline-block">
          {t("history.back")}
        </Link>
      </div>
    </div>
  );
}

function RunDetailPage() {
  const { id } = useParams({ from: "/run/$id" });
  const [run, setRun] = useState<Run | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editingWeather, setEditingWeather] = useState(false);
  const [pickingShoe, setPickingShoe] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
          {t("run.notFound")}
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

      {/* Shoe + record badges row */}
      {(() => {
        const prMap = loadPrs();
        const owned: PrCategory[] = PR_ORDER.filter(
          (cat) => prMap[cat]?.runId === run.id,
        );
        return (
          <div className="mt-3 flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setPickingShoe(true)}
              className="flex-1 min-w-0 flex items-center gap-3 p-3 rounded-2xl glass active:scale-[0.99] transition text-left"
              aria-label={t("run.shoe.change")}
            >
              <Footprints className="h-4 w-4 text-neon flex-shrink-0" />
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

            {owned.length > 0 && (
              <div className="flex-shrink-0 flex flex-col justify-center gap-1 px-3 py-2 rounded-2xl border border-neon/40 bg-neon/10 max-w-[45%]">
                <div className="flex items-center gap-1 text-neon">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-black">
                    {t("pr.newPr")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {owned.map((cat) => (
                    <span
                      key={cat}
                      className="px-1.5 py-0.5 rounded-full bg-neon text-primary-foreground text-[9px] font-black uppercase tracking-wider"
                    >
                      {t(`pr.cat.${cat}`)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* RPE row — directly below shoe/badges */}
      {typeof run.rpe === "number" && (
        <div className="mt-2 flex items-center justify-between gap-3 p-3 rounded-2xl glass">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {t("rpe.eyebrow")}
            </div>
            <div className="text-sm font-bold mt-0.5">{run.rpe} / 10</div>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i < (run.rpe ?? 0) ? "bg-neon" : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>
      )}

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

      {/* Share button — opens the share sheet */}
      <button
        onClick={() => setShareOpen(true)}
        className="mt-3 w-full h-12 rounded-2xl border border-neon/40 bg-neon/10 text-neon flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.18em] active:scale-95 transition"
      >
        <Share2 className="h-4 w-4" />
        {t("share.button")}
      </button>

      <ShareSheet open={shareOpen} onOpenChange={setShareOpen} run={run} />

      <section className="mt-3 grid grid-cols-2 gap-3">
        <StatTile label={t("stat.duration")} value={formatDuration(run.durationMs)} />
        <StatTile label={t("stat.avgPace")} value={formatPace(run.avgPaceSecPerKm)} unit={t("unit.perKm")} />
        <StatTile label={t("stat.cadence")} value={String(run.avgCadenceSpm)} unit={t("unit.spm")} />
        <StatTile label={t("stat.elevation")} value={Math.round(run.elevationGainM).toString()} unit={t("unit.m")} />
        {run.avgHrBpm != null && (
          <>
            <StatTile label="Avg HR" value={String(run.avgHrBpm)} unit="bpm" />
            <StatTile label="Max HR" value={String(run.maxHrBpm ?? run.avgHrBpm)} unit="bpm" />
          </>
        )}
      </section>

      <BioInsightCard run={run} />

      {(() => {
        const snapshot = computeRunMetrics(run);
        // Skip metrics already shown above (hero + 2x2 primary grid).
        const primary = new Set(["distance", "duration", "avgPace", "cadence", "elevation", "pace"]);
        const extras = ALL_METRIC_IDS.filter((id) => !primary.has(id));
        const fastestKmMs = bestTimeForPoints(run.points, 1000);
        return (
          <section className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold pb-2 px-1">
              {t("run.allMetrics")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label={t("stat.fastestKm")}
                value={fastestKmMs ? formatPace(Math.round(fastestKmMs / 1000)) : "—"}
                unit={fastestKmMs ? t("unit.perKm") : undefined}
                accent
              />
              {extras.map((id) => {
                const def = METRICS[id];
                return (
                  <StatTile
                    key={id}
                    label={t(def.labelKey)}
                    value={def.format(snapshot)}
                    unit={def.unitKey ? t(def.unitKey) : undefined}
                  />
                );
              })}
            </div>
          </section>
        );
      })()}

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
