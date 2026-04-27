import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { loadRuns } from "@/lib/run-types";
import { recoveryStatus, type RecoveryStatus as Status } from "@/lib/recovery-engine";

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

export default function RecoveryStatus() {
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const refresh = () => setStatus(recoveryStatus(loadRuns()));
    refresh();
    const id = window.setInterval(refresh, 60_000);
    window.addEventListener("orbit:run-updated", refresh);
    window.addEventListener("orbit:run-stop", refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("orbit:run-updated", refresh);
      window.removeEventListener("orbit:run-stop", refresh);
    };
  }, []);

  if (!status) return null;

  const pct =
    status.totalHours > 0
      ? Math.round((1 - status.hoursRemaining / status.totalHours) * 100)
      : 100;

  const ready = status.status === "ready";
  const message = (() => {
    if (ready) return t("recovery.ready");
    const a = status.analysis;
    if (a.message.key === "recovery.scenario.overreaching.distance") {
      return t(a.message.key, { pct: a.message.pct });
    }
    return t(a.message.key);
  })();

  const trailing = ready
    ? t("recovery.goRun")
    : t("recovery.readyAt", { time: formatReadyAt(status.readyAt, lang) });

  return (
    <section className="mt-4 glass rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold">
          {t("recovery.eyebrow")}
        </div>
        <div className="font-display font-black tabular text-foreground text-sm leading-none">
          <span className="text-neon">{status.hoursRemaining}</span>
          <span className="text-muted-foreground"> / {status.totalHours}</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold ml-1">
            {t("recovery.unit.h")}
          </span>
        </div>
      </div>
      <div
        className="mt-2 h-[2px] w-full bg-white/5 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-neon transition-all duration-500"
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] leading-snug text-foreground">
        {message}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neon/80 font-bold tabular">
        {trailing}
      </div>
    </section>
  );
}
