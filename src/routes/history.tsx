import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Footprints, Ghost, Heart, Mountain, Trash2, Trophy, Zap } from "lucide-react";
import { deleteRun, loadRuns, type Run, type Split } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import { ALL_METRIC_IDS, METRICS, computeRunMetrics } from "@/lib/stat-metrics";
import { bestTimeForPoints } from "@/lib/personal-records";
import RunMap from "@/components/RunMap";
import WeatherBadge from "@/components/WeatherBadge";
import { getShoeById } from "@/lib/shoes";
import { useI18n } from "@/lib/i18n";
import WeeklyTrimpBreakdown from "@/components/WeeklyTrimpBreakdown";

import { loadPrs, type PrCategory, type PrMap } from "@/lib/personal-records";
import { selectGhost } from "@/lib/ghost-runner";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [prs, setPrs] = useState<PrMap>({});
  const { t } = useI18n();
  

  useEffect(() => {
    setRuns(loadRuns());
    setPrs(loadPrs());
    const refresh = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", refresh);
    return () => window.removeEventListener("orbit:run-updated", refresh);
  }, []);

  // Map runId -> ordered list of PR categories that this run currently holds.
  const prsByRun = useMemo(() => {
    const map = new Map<string, PrCategory[]>();
    const order: PrCategory[] = ["1k", "5k", "10k", "half", "marathon", "fastestKm", "longest"];
    for (const cat of order) {
      const entry = prs[cat];
      if (!entry) continue;
      const list = map.get(entry.runId) ?? [];
      list.push(cat);
      map.set(entry.runId, list);
    }
    return map;
  }, [prs]);

  const totalDistance = runs.reduce((a, r) => a + r.distanceM, 0);
  const totalRuns = runs.length;
  const totalTime = runs.reduce((a, r) => a + r.durationMs, 0);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("history.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("history.title")}</h1>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("history.runs")}
          </div>
          <div className="font-display font-black text-2xl text-neon tabular">{totalRuns}</div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("history.distance")}
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDistance(totalDistance)}
            <span className="text-xs text-muted-foreground ml-1">{t("unit.km")}</span>
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {t("history.time")}
          </div>
          <div className="font-display font-black text-2xl tabular">
            {Math.floor(totalTime / 3600000)}
            <span className="text-xs text-muted-foreground ml-1">h</span>
          </div>
        </div>
      </section>

      {runs.length > 0 && <WeeklyTrimpBreakdown runs={runs} />}

      {runs.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground text-sm">{t("history.empty")}</p>
          <Link
            to="/"
            className="inline-block mt-4 rounded-xl bg-neon text-primary-foreground px-5 py-2.5 text-sm font-bold"
          >
            {t("history.startCta")}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 pb-4">
          {runs.map((r) => (
            <li key={r.id}>
              <ExpandableRunCard
                run={r}
                prCategories={prsByRun.get(r.id)}
                onDelete={() => {
                  if (confirm(t("history.deleteConfirm"))) {
                    deleteRun(r.id);
                    setRuns(loadRuns());
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

type ExpandableRunCardProps = {
  run: Run;
  prCategories: PrCategory[] | undefined;
  onDelete: () => void;
};

function ExpandableRunCard({ run, prCategories, onDelete }: ExpandableRunCardProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Map area still navigates to the full detail page */}
      <div className="h-32 relative">
        <Link
          to="/run/$id"
          params={{ id: run.id }}
          className="block h-full active:scale-[0.99] transition"
        >
          <RunMap points={run.points} className="h-full w-full" interactive={false} follow={false} />
          <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent pointer-events-none" />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/50 backdrop-blur text-foreground/80 hover:text-destructive"
            aria-label="Delete run"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {run.weather && (
            <div className="absolute top-2 left-2">
              <WeatherBadge weather={run.weather} variant="compact" />
            </div>
          )}
        </Link>
        {/* Ghost race button — top-right, left of delete */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            selectGhost(run, formatDate(run.startedAt));
            navigate({ to: "/" });
          }}
          className="absolute top-2 right-12 h-8 inline-flex items-center gap-1 rounded-full px-2.5 bg-black/50 backdrop-blur border border-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/90"
          aria-label={t("ghost.race")}
        >
          <Ghost className="h-3 w-3" />
          {t("ghost.race")}
        </button>
      </div>

      {/* Header row with expand toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
        aria-label={open ? t("history.collapse") : t("history.expand")}
        className="w-full p-3 flex items-center justify-between gap-3 text-left active:bg-white/5 transition cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {formatDate(run.startedAt)}
          </div>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span className="font-display font-black text-2xl text-neon tabular">
              {formatDistance(run.distanceM)}
              <span className="text-xs text-muted-foreground ml-1 font-semibold">
                {t("unit.km")}
              </span>
            </span>
            <span className="font-mono text-sm text-foreground/80">
              {formatDuration(run.durationMs)}
            </span>
            <span className="font-mono text-sm text-foreground/60">
              {formatPace(run.avgPaceSecPerKm)}
              {t("unit.perKm")}
            </span>
            {run.avgHrBpm ? (
              <span className="inline-flex items-baseline gap-1 font-mono text-sm text-foreground/70">
                <Heart className="h-3 w-3 self-center text-neon" fill="currentColor" />
                {Math.round(run.avgHrBpm)}
                <span className="text-[10px] text-muted-foreground">{t("unit.bpm")}</span>
              </span>
            ) : null}
          </div>
          {prCategories?.length ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {prCategories.map((cat) => (
                <PrBadge key={cat} category={cat} />
              ))}
            </div>
          ) : null}
          {(() => {
            const shoe = getShoeById(run.shoeId);
            if (!shoe) return null;
            return (
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
                <Footprints className="h-3 w-3 text-neon" />
                <span className="truncate">
                  {shoe.brand} {shoe.model}
                </span>
              </div>
            );
          })()}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />

      </div>

      {open && <RunDetailPanel run={run} />}
    </div>
  );
}

function RunDetailPanel({ run }: { run: Run }) {
  const { t } = useI18n();

  // Insights derived from the saved run.
  const fastestKmMs = useMemo(() => bestTimeForPoints(run.points, 1000), [run.points]);
  const fastestKmPaceSec = fastestKmMs ? Math.round(fastestKmMs / 1000) : null;

  const splits = run.splits ?? [];
  const fastestSplit = splits.length
    ? splits.reduce((a, b) => (b.paceSecPerKm < a.paceSecPerKm ? b : a))
    : null;
  const slowestSplit = splits.length
    ? splits.reduce((a, b) => (b.paceSecPerKm > a.paceSecPerKm ? b : a))
    : null;

  const paceDeltaSec =
    fastestKmPaceSec && run.avgPaceSecPerKm > 0
      ? run.avgPaceSecPerKm - fastestKmPaceSec
      : null;

  const snapshot = computeRunMetrics(run);
  const basicIds = ["distance", "duration", "avgPace", "cadence", "elevation"] as const;
  const advancedIds = ALL_METRIC_IDS.filter(
    (id) => !basicIds.includes(id as (typeof basicIds)[number]) && id !== "pace",
  );

  return (
    <div className="border-t border-white/5 px-3 pt-3 pb-3 space-y-4">
      {/* RPE */}
      {typeof run.rpe === "number" && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5">
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

      {/* Insights */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold pb-1.5 px-0.5">
          {t("history.insights")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InsightTile
            label={t("history.fastestSplit")}
            value={fastestSplit ? formatPace(fastestSplit.paceSecPerKm) : "—"}
            sub={fastestSplit ? `${t("history.km")} ${fastestSplit.km}` : undefined}
            unit={fastestSplit ? t("unit.perKm") : undefined}
            accent
          />
          <InsightTile
            label={t("history.slowestSplit")}
            value={slowestSplit ? formatPace(slowestSplit.paceSecPerKm) : "—"}
            sub={slowestSplit ? `${t("history.km")} ${slowestSplit.km}` : undefined}
            unit={slowestSplit ? t("unit.perKm") : undefined}
          />
          <InsightTile
            label={t("stat.fastestKm")}
            value={fastestKmPaceSec ? formatPace(fastestKmPaceSec) : "—"}
            unit={fastestKmPaceSec ? t("unit.perKm") : undefined}
            accent
          />
          <InsightTile
            label={t("history.paceDelta")}
            value={
              paceDeltaSec === null
                ? "—"
                : `${paceDeltaSec >= 0 ? "−" : "+"}${formatPace(Math.abs(paceDeltaSec))}`
            }
            sub={
              paceDeltaSec === null
                ? undefined
                : paceDeltaSec >= 0
                  ? t("history.faster")
                  : t("history.slower")
            }
            unit={paceDeltaSec === null ? undefined : t("unit.perKm")}
          />
        </div>
      </div>

      {/* Basic metrics */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold pb-1.5 px-0.5">
          {t("history.basicMetrics")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {basicIds.map((id) => {
            const def = METRICS[id];
            return (
              <InsightTile
                key={id}
                label={t(def.labelKey)}
                value={def.format(snapshot)}
                unit={def.unitKey ? t(def.unitKey) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Advanced metrics */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold pb-1.5 px-0.5">
          {t("history.advancedMetrics")}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {advancedIds.map((id) => {
            const def = METRICS[id];
            return (
              <InsightTile
                key={id}
                label={t(def.labelKey)}
                value={def.format(snapshot)}
                unit={def.unitKey ? t(def.unitKey) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Mini splits chart — tap a bar to inspect that km */}
      {splits.length > 0 && (
        <SplitsMiniChart splits={splits} fastestKm={fastestSplit?.km ?? null} />
      )}

      <Link
        to="/run/$id"
        params={{ id: run.id }}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-bold uppercase tracking-[0.18em] text-foreground/80 transition"
      >
        {t("history.viewFull")}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function InsightTile({
  label,
  value,
  unit,
  sub,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold truncate">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className={`font-display font-black tabular text-base leading-none ${accent ? "text-neon" : "text-foreground"}`}>
          {value}
        </span>
        {unit && <span className="text-[10px] text-muted-foreground font-bold">{unit}</span>}
      </div>
      {sub && (
        <div className="text-[9px] text-muted-foreground font-semibold mt-0.5 truncate">{sub}</div>
      )}
    </div>
  );
}

const PR_BADGE_META: Record<
  PrCategory,
  { label: string; Icon: typeof Trophy }
> = {
  "1k": { label: "1K", Icon: Trophy },
  "5k": { label: "5K", Icon: Trophy },
  "10k": { label: "10K", Icon: Trophy },
  half: { label: "HM", Icon: Trophy },
  marathon: { label: "FM", Icon: Trophy },
  fastestKm: { label: "KM", Icon: Zap },
  longest: { label: "LR", Icon: Mountain },
};

function PrBadge({ category }: { category: PrCategory }) {
  const { label, Icon } = PR_BADGE_META[category];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-neon/15 text-neon border border-neon/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      title={`PR · ${label}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function SplitsMiniChart({ splits, fastestKm }: { splits: Split[]; fastestKm: number | null }) {
  const { t } = useI18n();
  const [selectedKm, setSelectedKm] = useState<number | null>(fastestKm);

  // Keep selection valid if the run changes.
  useEffect(() => {
    if (selectedKm == null || !splits.some((s) => s.km === selectedKm)) {
      setSelectedKm(fastestKm ?? splits[0]?.km ?? null);
    }
  }, [splits, fastestKm, selectedKm]);

  const max = Math.max(...splits.map((s) => s.paceSecPerKm));
  const min = Math.min(...splits.map((s) => s.paceSecPerKm));
  const range = Math.max(1, max - min);
  const selected = splits.find((s) => s.km === selectedKm) ?? null;

  return (
    <div>
      <div className="flex items-end justify-between pb-1.5 px-0.5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          {t("splits.title")}
        </div>
        {selected && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-full bg-neon/15 border border-neon/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neon"
          >
            {t("splits.km")} {selected.km} · {formatPace(selected.paceSecPerKm)} {t("unit.perKm")}
          </div>
        )}
      </div>

      {/* Vertical bars — tap to select */}
      <div className="flex items-end gap-1.5 h-20 px-0.5">
        {splits.map((s) => {
          // Lower pace (faster) → taller bar. Floor at 18% so all bars are tappable.
          const heightPct = 100 - ((s.paceSecPerKm - min) / range) * 70;
          const isSelected = selectedKm === s.km;
          const isBest = fastestKm === s.km;
          return (
            <button
              key={s.km}
              type="button"
              onClick={() => setSelectedKm(s.km)}
              aria-label={`${t("splits.km")} ${s.km}, ${formatPace(s.paceSecPerKm)} ${t("unit.perKm")}`}
              aria-pressed={isSelected}
              className="group flex-1 h-full flex flex-col justify-end items-stretch min-w-0 active:scale-95 transition"
            >
              <div
                className={[
                  "w-full rounded-t-md transition-all",
                  isSelected
                    ? "bg-neon shadow-[0_0_10px_oklch(0.92_0.21_130/0.7)]"
                    : isBest
                      ? "bg-neon/60"
                      : "bg-foreground/30 group-hover:bg-foreground/50",
                ].join(" ")}
                style={{ height: `${Math.max(18, heightPct)}%` }}
              />
            </button>
          );
        })}
      </div>

      {/* Km axis labels */}
      <div className="flex gap-1.5 px-0.5 pt-1">
        {splits.map((s) => {
          const isSelected = selectedKm === s.km;
          return (
            <div
              key={s.km}
              className={`flex-1 text-center text-[9px] font-bold tabular tracking-wider ${
                isSelected ? "text-neon" : "text-muted-foreground"
              }`}
            >
              {s.km}
            </div>
          );
        })}
      </div>
    </div>
  );
}

