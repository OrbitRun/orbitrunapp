import { useI18n } from "@/lib/i18n";
import type { RunAnalysis } from "@/lib/recovery-engine";

type Props = {
  analysis: RunAnalysis;
  readyAt: number;
};

function formatReadyAt(ts: number, lang: "en" | "da"): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString(lang === "da" ? "da-DK" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return time;
  if (isTomorrow) return `${lang === "da" ? "i morgen" : "tomorrow"} ${time}`;
  const day = d.toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", { weekday: "short" });
  return `${day} ${time}`;
}

export default function RecoveryInsight({ analysis, readyAt }: Props) {
  const { t, lang } = useI18n();

  const headline = (() => {
    if (analysis.headline.key === "recovery.headline.longestInWeeks") {
      return t(analysis.headline.key, { weeks: analysis.headline.weeks });
    }
    if (analysis.headline.key === "recovery.headline.fastestInWeeks") {
      return t(analysis.headline.key, { weeks: analysis.headline.weeks });
    }
    return t(analysis.headline.key);
  })();

  const message = (() => {
    if (analysis.message.key === "recovery.scenario.overreaching.distance") {
      return t(analysis.message.key, { pct: analysis.message.pct });
    }
    return t(analysis.message.key);
  })();

  const ready = formatReadyAt(readyAt, lang);

  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("recovery.eyebrow")}
        </div>
        <div className="font-display font-black tabular text-foreground text-base leading-none">
          {analysis.recommendedHours}
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
            {t("recovery.unit.h")}
          </span>
        </div>
      </div>
      <div className="mt-2 font-display font-black text-base leading-tight text-foreground">
        {headline}
      </div>
      <div className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
        {message}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold tabular">
        {t("recovery.readyAt", { time: ready })}
      </div>
    </section>
  );
}
