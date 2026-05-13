import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadRuns, type Run } from "@/lib/run-types";
import { formatDuration } from "@/lib/run-utils";
import {
  PREDICTION_DISTANCES,
  predictRaceTimes,
  hasLongRunFor,
  MARATHON_REALISM_MIN_M,
  type PredictionDistance,
  type PredictionMap,
} from "@/lib/performance-prediction";
import {
  appendSnapshot,
  loadHistory,
  monthlyDelta,
  type PredictionSnapshot,
} from "@/lib/prediction-history";
import InfoHint from "@/components/InfoHint";

function formatDelta(ms: number): string {
  const abs = Math.abs(Math.round(ms / 1000));
  if (abs < 60) return `${abs}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default function PerformancePredictionCard() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [history, setHistory] = useState<PredictionSnapshot[]>([]);

  useEffect(() => {
    setRuns(loadRuns());
    setHistory(loadHistory());
    const refresh = () => setRuns(loadRuns());
    window.addEventListener("orbit:run-updated", refresh);
    window.addEventListener("orbit:run-stop", refresh);
    return () => {
      window.removeEventListener("orbit:run-updated", refresh);
      window.removeEventListener("orbit:run-stop", refresh);
    };
  }, []);

  const predictions: PredictionMap = useMemo(() => predictRaceTimes(runs), [runs]);
  const hasAny = Object.keys(predictions).length > 0;
  const marathonRealistic = useMemo(
    () => hasLongRunFor(runs, MARATHON_REALISM_MIN_M),
    [runs],
  );

  // Snapshot the current prediction once per mount (rate-limited to 6h inside).
  useEffect(() => {
    if (!hasAny) return;
    const next = appendSnapshot(predictions);
    setHistory(next);
  }, [hasAny, predictions]);

  return (
    <section className="mt-1 mb-3 glass rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">
            {t("prediction.title")}
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mt-0.5">
            {t("prediction.eyebrow")}
          </div>
        </div>
      </div>

      {!hasAny && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {t("prediction.empty")}
        </p>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        disabled={!hasAny}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neon/10 border border-neon/30 text-neon text-xs font-black uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition disabled:opacity-40 disabled:pointer-events-none"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        {open ? t("prediction.cta.hide") : t("prediction.cta.show")}
      </button>

      {open && hasAny && (
        <div className="mt-3">
          {PREDICTION_DISTANCES.map(({ id, meters }, idx) => {
            const value = predictions[id];
            if (value == null) return null;
            const delta = monthlyDelta(history, predictions, id);
            const theoretical = id === "marathon" && !marathonRealistic;
            const isFirst = idx === 0;
            return (
              <div
                key={id}
                className={
                  isFirst
                    ? "flex items-baseline justify-between gap-3 py-3"
                    : "flex items-baseline justify-between gap-3 py-3 border-t border-white/5"
                }
              >
                <div className="flex flex-col min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                    {t(`prediction.distance.${id}` as const)}
                  </div>
                  {theoretical ? (
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
                      <span>{t("prediction.theoretical")}</span>
                      <InfoHint
                        label={t("prediction.theoretical")}
                        text={t("prediction.theoretical.info")}
                      />
                    </div>
                  ) : (
                    <DeltaRow delta={delta} t={t} />
                  )}
                </div>
                <div className="font-display font-black text-2xl tabular leading-none shrink-0">
                  {formatDuration(value)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DeltaRow({
  delta,
  t,
}: {
  delta: { deltaMs: number; baselineMs: number } | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  if (!delta) {
    return (
      <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
        {t("prediction.delta.none")}
      </div>
    );
  }
  const faster = delta.deltaMs < 0;
  const same = Math.abs(delta.deltaMs) < 1000;
  if (same) {
    return (
      <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
        {t("prediction.delta.flat")}
      </div>
    );
  }
  const value = (faster ? "−" : "+") + formatDelta(delta.deltaMs);
  const Icon = faster ? ArrowUp : ArrowDown;
  return (
    <div
      className={
        "mt-1 flex items-center gap-1 text-[11px] leading-snug " +
        (faster ? "text-neon font-bold" : "text-muted-foreground")
      }
    >
      <Icon className="h-3 w-3" />
      <span>{t(faster ? "prediction.delta.faster" : "prediction.delta.slower", { value })}</span>
    </div>
  );
}
