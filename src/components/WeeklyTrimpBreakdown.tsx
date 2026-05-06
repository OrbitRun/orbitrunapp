import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import type { Run } from "@/lib/run-types";
import { computeTrimp } from "@/lib/readiness-engine";
import { loadHrZones } from "@/lib/hr-zones-config";
import { useI18n } from "@/lib/i18n";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import InfoHint from "@/components/InfoHint";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function startOfWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

type DayBucket = {
  key: (typeof DAY_KEYS)[number];
  date: number;
  runs: Array<Run & { _trimp: number }>;
  trimp: number;
};

export default function WeeklyTrimpBreakdown({ runs }: { runs: Run[] }) {
  const { t } = useI18n();
  const [weekOffset, setWeekOffset] = useState(0);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const hrCfg = useMemo(() => loadHrZones(), []);

  const weekStart = useMemo(
    () => startOfWeek(Date.now()) - weekOffset * 7 * DAY_MS,
    [weekOffset],
  );
  const weekEnd = weekStart + 7 * DAY_MS;

  const enriched = useMemo(
    () =>
      runs.map((r) => ({
        ...r,
        _trimp:
          r.trimp ??
          computeTrimp(
            r,
            hrCfg ? { restingHr: hrCfg.restingHr, maxHr: hrCfg.maxHr } : null,
          ),
      })),
    [runs, hrCfg],
  );

  const days: DayBucket[] = useMemo(() => {
    const out: DayBucket[] = DAY_KEYS.map((k, i) => ({
      key: k,
      date: weekStart + i * DAY_MS,
      runs: [],
      trimp: 0,
    }));
    for (const r of enriched) {
      if (r.endedAt < weekStart || r.endedAt >= weekEnd) continue;
      const idx = Math.floor((r.endedAt - weekStart) / DAY_MS);
      if (idx < 0 || idx > 6) continue;
      out[idx].runs.push(r);
      out[idx].trimp += r._trimp;
    }
    return out;
  }, [enriched, weekStart, weekEnd]);

  const weekTotal = days.reduce((s, d) => s + d.trimp, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.trimp));
  const distanceTotal = days.reduce(
    (s, d) => s + d.runs.reduce((a, r) => a + r.distanceM, 0),
    0,
  );

  const weekLabel = new Date(weekStart).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  const weekEndLabel = new Date(weekEnd - DAY_MS).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  return (
    <section className="glass rounded-2xl p-4 mb-4">
      <header className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold flex items-center gap-1.5">
            <Activity className="h-3 w-3" />
            {t("trimp.weeklyTitle")}
          </div>
          <div className="font-display font-black text-xl tabular leading-tight mt-0.5">
            {weekTotal} <span className="text-xs text-muted-foreground">TRIMP</span>
          </div>
          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
            {weekLabel} – {weekEndLabel} · {formatDistance(distanceTotal)} {t("unit.km")}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="h-8 w-8 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold"
            aria-label={t("trimp.prevWeek")}
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="h-8 w-8 grid place-items-center rounded-lg bg-white/5 hover:bg-white/10 text-sm font-bold disabled:opacity-40"
            aria-label={t("trimp.nextWeek")}
          >
            ›
          </button>
        </div>
      </header>

      <div className="flex items-end gap-1.5 h-24">
        {days.map((d) => {
          const heightPct = d.trimp === 0 ? 4 : Math.max(8, (d.trimp / maxDay) * 100);
          const isOpen = openDay === d.key + d.date;
          const id = d.key + d.date;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpenDay(isOpen ? null : id)}
              className="flex-1 h-full flex flex-col justify-end items-stretch active:scale-95 transition"
              aria-pressed={isOpen}
              aria-label={`${t(`trimp.day.${d.key}`)} · ${d.trimp} TRIMP`}
            >
              <div
                className={`w-full rounded-t-md transition ${
                  isOpen
                    ? "bg-neon shadow-[0_0_10px_oklch(0.92_0.21_130/0.6)]"
                    : d.trimp > 0
                      ? "bg-neon/60"
                      : "bg-foreground/15"
                }`}
                style={{ height: `${heightPct}%` }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-1.5 pt-1">
        {days.map((d) => (
          <div
            key={d.key + d.date}
            className={`flex-1 text-center text-[9px] font-bold uppercase tracking-wider ${
              openDay === d.key + d.date ? "text-neon" : "text-muted-foreground"
            }`}
          >
            {t(`trimp.day.${d.key}`)}
          </div>
        ))}
      </div>

      {openDay && (() => {
        const d = days.find((x) => x.key + x.date === openDay);
        if (!d) return null;
        return (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {new Date(d.date).toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
              {" · "}
              {d.trimp} TRIMP
            </div>
            {d.runs.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t("trimp.dayEmpty")}</p>
            ) : (
              d.runs.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold tabular">
                      {formatDistance(r.distanceM)} {t("unit.km")}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      {formatDuration(r.durationMs)}
                      {r.avgHrBpm ? ` · ${Math.round(r.avgHrBpm)} ${t("unit.bpm")}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-black text-lg text-neon tabular leading-none">
                      {r._trimp}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                      TRIMP
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}
    </section>
  );
}
