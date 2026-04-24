import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import RunMap from "@/components/RunMap";
import WeatherBadge from "@/components/WeatherBadge";
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
import { addDistanceToPrimary } from "@/lib/shoes";

type Props = {
  run: Run;
  onSave: () => void;
  onDiscard: () => void;
};

export default function RunSummary({ run, onSave, onDiscard }: Props) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);
  const max = run.splits.length ? Math.max(...run.splits.map((x) => x.paceSecPerKm)) : 0;
  const min = run.splits.length ? Math.min(...run.splits.map((x) => x.paceSecPerKm)) : 0;
  const range = Math.max(1, max - min);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-xl animate-fade-in">
      <main className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-8">
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
          {run.weather && (
            <div className="mt-2 flex justify-center">
              <WeatherBadge weather={run.weather} />
            </div>
          )}
        </header>

        <section className="rounded-3xl overflow-hidden border border-border shadow-card mt-2">
          <RunMap points={run.points} className="h-[240px] w-full" interactive={true} follow={false} />
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

        {/* Action buttons fixed directly under stats */}
        <section className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setConfirmOpen(true)}
            className="h-14 rounded-2xl border border-destructive/60 bg-destructive/10 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-destructive active:scale-95 transition"
          >
            <Trash2 className="h-4 w-4" />
            {t("summary.discard")}
          </button>
          <button
            onClick={() => {
              addDistanceToPrimary(run.distanceM);
              try {
                window.dispatchEvent(new Event("orbit:shoes-updated"));
              } catch {
                /* noop */
              }
              onSave();
            }}
            className="h-14 rounded-2xl bg-neon text-primary-foreground flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.18em] shadow-neon active:scale-95 transition"
          >
            <Check className="h-4 w-4" />
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
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(false);
                setTimeout(() => setFinalConfirmOpen(true), 120);
              }}
              className="rounded-xl bg-destructive/80 text-destructive-foreground hover:bg-destructive"
            >
              {t("summary.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={finalConfirmOpen} onOpenChange={setFinalConfirmOpen}>
        <AlertDialogContent className="glass-strong border-destructive/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-black text-xl text-destructive">
              {t("summary.finalConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("summary.finalConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl bg-neon text-primary-foreground hover:bg-neon/90 border-0 font-bold">
              {t("summary.keep")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={onDiscard}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("summary.finalDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
