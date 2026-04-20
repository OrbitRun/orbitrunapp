import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { deleteRun, loadRuns, type Run } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import RunMap from "@/components/RunMap";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [runs, setRuns] = useState<Run[]>([]);

  useEffect(() => {
    setRuns(loadRuns());
  }, []);

  const totalDistance = runs.reduce((a, r) => a + r.distanceM, 0);
  const totalRuns = runs.length;
  const totalTime = runs.reduce((a, r) => a + r.durationMs, 0);

  return (
    <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          Archive
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">Past runs</h1>
      </header>

      <section className="grid grid-cols-3 gap-3 mb-4">
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Runs
          </div>
          <div className="font-display font-black text-2xl text-neon tabular">
            {totalRuns}
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Distance
          </div>
          <div className="font-display font-black text-2xl tabular">
            {formatDistance(totalDistance)}
            <span className="text-xs text-muted-foreground ml-1">km</span>
          </div>
        </div>
        <div className="glass rounded-2xl p-3 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Time
          </div>
          <div className="font-display font-black text-2xl tabular">
            {Math.floor(totalTime / 3600000)}
            <span className="text-xs text-muted-foreground ml-1">h</span>
          </div>
        </div>
      </section>

      {runs.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No runs yet. Hit the start button to log your first one.
          </p>
          <Link
            to="/"
            className="inline-block mt-4 rounded-xl bg-neon text-primary-foreground px-5 py-2.5 text-sm font-bold"
          >
            Start a run
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
                      if (confirm("Delete this run?")) {
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
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {formatDate(r.startedAt)}
                    </div>
                    <div className="flex items-baseline gap-3 mt-0.5">
                      <span className="font-display font-black text-2xl text-neon tabular">
                        {formatDistance(r.distanceM)}
                        <span className="text-xs text-muted-foreground ml-1 font-semibold">
                          km
                        </span>
                      </span>
                      <span className="font-mono text-sm text-foreground/80">
                        {formatDuration(r.durationMs)}
                      </span>
                      <span className="font-mono text-sm text-foreground/60">
                        {formatPace(r.avgPaceSecPerKm)}/km
                      </span>
                    </div>
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
