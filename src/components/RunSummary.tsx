import { useState } from "react";
import RunMap from "@/components/RunMap";
import StatTile from "@/components/StatTile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Run } from "@/lib/run-types";
import { formatDate, formatDistance, formatDuration, formatPace } from "@/lib/run-utils";
import { useI18n } from "@/lib/i18n";

type Props = {
  run: Run;
  onSave: () => void;
  onDiscard: () => void;
};

export default function RunSummary({ run, onSave, onDiscard }: Props) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const max = run.splits.length ? Math.max(...run.splits.map((x) => x.paceSecPerKm)) : 0;
  const min = run.splits.length ? Math.min(...run.splits.map((x) => x.paceSecPerKm)) : 0;
  const range = Math.max(1, max - min);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-xl animate-fade-in flex flex-col">
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-[calc(6rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4">
        <header className="py-3 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
            {t("summary.subtitle")}
          </div>
          <h1 className="font-display font-black text-3xl tracking-tight mt-1">
            {t("summary.title")}
          </h1>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold mt-1">
            {formatDate(run.startedAt)}
          </div>
        </header>

        {/* 1. Map */}
        <section className="rounded-3xl overflow-hidden border border-border shadow-card">
          <RunMap points={run.points} className="h-[240px] w-full" interactive={true} follow={false} />
        </section>

        {/* 2. Hero distance + stats grid */}
        <section className="glass-strong rounded-3xl p-5 text-center overflow-visible">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {t("stat.distance")}
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-2 overflow-visible">
            <span className="font-display font-black tabular text-[64px] leading-none text-neon [filter:drop-shadow(0_0_24px_oklch(0.92_0.21_130/0.55))_drop-shadow(0_0_48px_oklch(0.92_0.21_130/0.3))]">
              {formatDistance(run.distanceM)}
            </span>
            <span className="text-sm text-muted-foreground font-semibold">{t("unit.km")}</span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatTile label={t("stat.duration")} value={formatDuration(run.durationMs)} />
          <StatTile label={t("stat.avgPace")} value={formatPace(run.avgPaceSecPerKm)} unit={t("unit.perKm")} />
          <StatTile label={t("stat.cadence")} value={String(run.avgCadenceSpm)} unit={t("unit.spm")} />
          <StatTile label={t("stat.elevation")} value={Math.round(run.elevationGainM).toString()} unit={t("unit.m")} />
        </section>

        {run.splits.length > 0 && (
          <section className="glass rounded-2xl p-4">
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

        {/* Action buttons in natural flow, below all stats */}
        <section className="flex flex-row gap-4 pt-2 px-1 pb-2 overflow-visible">
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate(40); } catch { /* noop */ }
              }
              setConfirmOpen(true);
            }}
            className="flex-1 h-14 rounded-2xl glass backdrop-blur-xl flex items-center justify-center text-sm font-black uppercase tracking-[0.22em] active:scale-95 transition"
            style={{
              color: "oklch(0.72 0.14 25)",
              boxShadow:
                "0 0 32px 4px oklch(0.65 0.18 25 / 0.28), 0 0 64px 12px oklch(0.65 0.18 25 / 0.18)",
            }}
          >
            {t("summary.discard")}
          </button>
          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                try { navigator.vibrate(60); } catch { /* noop */ }
              }
              onSave();
            }}
            className="flex-1 h-14 rounded-2xl bg-neon text-primary-foreground flex items-center justify-center text-sm font-black uppercase tracking-[0.22em] shadow-neon active:scale-95 transition"
          >
            {t("summary.save")}
          </button>
        </section>
      </main>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="glass-strong border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-black text-xl">
              {t("summary.discardConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("summary.discardConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("summary.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDiscard}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("summary.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
