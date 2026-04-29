import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { subscribeBtHr } from "@/lib/heart-rate-bt";
import type { Run } from "@/lib/run-types";
import { classifyHrrGrade } from "@/lib/hr-zones";

type Props = { run: Run };

const GRADE_TONE: Record<string, string> = {
  elite: "text-neon",
  excellent: "text-neon",
  good: "text-foreground",
  fair: "text-foreground",
  poor: "text-destructive",
};

// 60-second countdown shown right after the user finishes a run while the
// tracker keeps HR sources open (75s post-stop window). When the recovery
// drop is settled, the card morphs into a graded result.
//
// Skipped silently if the run has no `hrSeries` (no strap was active).
export default function HrrCountdown({ run }: Props) {
  const { t } = useI18n();
  const enabled = (run.hrSeries?.length ?? 0) > 1;

  const [secLeft, setSecLeft] = useState(60);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [drop, setDrop] = useState<number | undefined>(run.hrrDrop60s);
  const [grade, setGrade] = useState<string | undefined>(run.recoveryGrade);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      const left = Math.max(0, 60 - Math.floor((Date.now() - startRef.current) / 1000));
      setSecLeft(left);
    }, 250);
    return () => window.clearInterval(id);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const unsub = subscribeBtHr((bt) => {
      if (bt.bpm != null) setLiveBpm(bt.bpm);
    });
    return () => unsub();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const onUpdate = (ev: Event) => {
      const detail = (ev as CustomEvent<{
        runId?: string;
        hrrDrop60s?: number;
        recoveryGrade?: string;
      }>).detail;
      if (detail?.runId !== run.id) return;
      if (typeof detail.hrrDrop60s === "number") {
        setDrop(detail.hrrDrop60s);
        setGrade(detail.recoveryGrade ?? classifyHrrGrade(detail.hrrDrop60s));
      }
    };
    window.addEventListener("orbit:run-updated", onUpdate);
    return () => window.removeEventListener("orbit:run-updated", onUpdate);
  }, [enabled, run.id]);

  if (!enabled) return null;

  // Settled state — show the grade.
  if (drop != null && grade) {
    const tone = GRADE_TONE[grade] ?? "text-foreground";
    return (
      <section className="mt-3 rounded-2xl border border-neon/30 bg-neon/[0.06] p-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold">
            {t("hrr.countdown.resultTitle")}
          </div>
          <div className={`font-display font-black tabular text-base leading-none ${tone}`}>
            −{drop}
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
              {t("hrr.unit")}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Heart className={`h-4 w-4 ${tone}`} fill="currentColor" />
          <span className={`font-display font-black uppercase tracking-[0.2em] text-sm ${tone}`}>
            {t(`hrr.grade.${grade}`)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground leading-snug">
          {t("hrr.countdown.resultBody")}
        </div>
      </section>
    );
  }

  // Active countdown.
  const progress = (60 - secLeft) / 60;
  const C = 2 * Math.PI * 28;
  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-4">
      <div className="relative h-16 w-16 flex-shrink-0">
        <svg viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r="28"
            fill="none"
            className="text-neon"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={C}
            strokeDashoffset={(1 - progress) * C}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center font-display font-black tabular text-lg">
          {secLeft}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("hrr.countdown.title")}
        </div>
        <div className="mt-1 text-[11px] text-foreground leading-snug">
          {t("hrr.countdown.body")}
        </div>
        {liveBpm != null && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
            <Heart className="h-3 w-3 text-neon" fill="currentColor" />
            <span className="font-bold tabular">{liveBpm}</span>
            <span className="text-muted-foreground">{t("unit.bpm")}</span>
          </div>
        )}
      </div>
    </section>
  );
}
