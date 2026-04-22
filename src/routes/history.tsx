import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Footprints, Thermometer, Trash2 } from "lucide-react";
import { deleteRun, loadRuns, type Run } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import RunMap from "@/components/RunMap";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    setRuns(loadRuns());
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3 mb-2">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("history.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("history.title")}</h1>
      </header>

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
              <Link
                to="/run/$id"
                params={{ id: r.id }}
                className="block glass rounded-2xl overflow-hidden active:scale-[0.99] transition"
              >
                <div className="h-32 relative">
                  <RunMap
                    points={r.points}
                    className="h-full w-full"
                    interactive={false}
                    follow={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent pointer-events-none" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(t("history.deleteConfirm"))) {
                        deleteRun(r.id);
                        setRuns(loadRuns());
                      }
                    }}
                    className="absolute top-2 right-2 h-8 w-8 grid place-items-center rounded-full bg-black/50 backdrop-blur text-foreground/80 hover:text-destructive"
                    aria-label="Delete run"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {formatDate(r.startedAt)}
                    </div>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="font-display font-black text-2xl text-neon tabular">
                        {formatDistance(r.distanceM)}
                        <span className="text-xs text-muted-foreground ml-1 font-semibold">
                          {t("unit.km")}
                        </span>
                      </span>
                      <span className="font-mono text-sm text-foreground/80">
                        {formatDuration(r.durationMs)}
                      </span>
                      <span className="font-mono text-sm text-foreground/60">
                        {formatPace(r.avgPaceSecPerKm)}
                        {t("unit.perKm")}
                      </span>
                    </div>
                    {(r.shoe || r.weather) && (
                      <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                        {r.shoe && (
                          <span className="flex items-center gap-1 min-w-0">
                            <Footprints className="h-3 w-3 text-neon shrink-0" />
                            <span className="truncate font-semibold">
                              {r.shoe.brand} {r.shoe.model}
                            </span>
                          </span>
                        )}
                        {r.weather && (
                          <span className="flex items-center gap-1 shrink-0">
                            <span aria-hidden>{r.weather.icon}</span>
                            <span className="font-mono font-bold tabular">{r.weather.tempC}°C</span>
                            <span className="hidden sm:inline">· {r.weather.label}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
