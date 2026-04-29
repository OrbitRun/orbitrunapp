import { useMemo, useRef, useState, type CSSProperties } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useI18n } from "@/lib/i18n";
import type { Run } from "@/lib/run-types";
import {
  buildHrGraph,
  efficiencyFactor,
  nearestIndexByMs,
  summarizeHr,
  zoneBoundaries,
  type HrGraphPoint,
} from "@/lib/hr-graph";
import { DEFAULT_MAX_HR } from "@/lib/hr-analysis";
import { estimateVo2Max } from "@/lib/vo2max";
import { formatDuration, formatPace } from "@/lib/run-utils";
import { exportHrAnalyticsPdf } from "@/lib/hr-pdf-report";
import { Download } from "lucide-react";

type Props = {
  run: Run;
  onScrub?: (point: HrGraphPoint | null) => void;
};

const NEON = "oklch(0.92 0.21 130)";

function fmtMs(ms: number): string {
  return formatDuration(ms);
}

function fmtKm(distM: number): string {
  return (distM / 1000).toFixed(2);
}

export default function HrAnalyticsCard({ run, onScrub }: Props) {
  const { t } = useI18n();
  const series = useMemo(() => buildHrGraph(run), [run]);
  const stats = useMemo(() => summarizeHr(run.hrSeries), [run.hrSeries]);
  const ef = useMemo(() => efficiencyFactor(run), [run]);
  const vo2 = useMemo(() => run.vo2maxEst ?? estimateVo2Max(run), [run]);
  const boundaries = useMemo(() => zoneBoundaries(DEFAULT_MAX_HR), []);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  if (!run.hrSeries || run.hrSeries.length < 2 || series.length < 2) {
    return (
      <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("hr.graph.title")}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{t("hr.graph.empty")}</div>
      </section>
    );
  }

  const minBpm = Math.max(40, Math.floor(Math.min(...series.map((s) => s.bpm)) / 5) * 5 - 5);
  const maxBpm = Math.min(220, Math.ceil(Math.max(...series.map((s) => s.bpm)) / 5) * 5 + 5);
  const yDomain: [number, number] = [
    Math.min(minBpm, Math.round(DEFAULT_MAX_HR * 0.55)),
    Math.max(maxBpm, Math.round(DEFAULT_MAX_HR * 0.95)),
  ];

  const active = activeIdx != null ? series[activeIdx] : null;

  const handleMove = (state: unknown) => {
    if (!state || typeof state !== "object") return;
    const s = state as { activeLabel?: number; activeTooltipIndex?: number };
    let idx: number | null = null;
    if (typeof s.activeTooltipIndex === "number") idx = s.activeTooltipIndex;
    else if (typeof s.activeLabel === "number") idx = nearestIndexByMs(series, s.activeLabel);
    if (idx == null || idx < 0 || idx >= series.length) return;
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      onScrub?.(series[idx]);
    }
  };

  const handleLeave = () => {
    if (activeIdx != null) {
      setActiveIdx(null);
      onScrub?.(null);
    }
  };

  const chartStyle: CSSProperties = { touchAction: "pan-y" };

  // Touch fallback: Recharts ComposedChart doesn't expose onTouchMove props,
  // so we map a touch's clientX to elapsed-ms using the chart wrapper rect.
  // We approximate by treating the visible plot area as the wrapper minus
  // the YAxis width (28px) and the right margin (8px).
  const Y_AXIS_W = 28;
  const RIGHT_M = 8;
  const handleTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    const el = wrapRef.current;
    if (!el || series.length === 0) return;
    const touch = e.touches[0] ?? e.changedTouches[0];
    if (!touch) return;
    const rect = el.getBoundingClientRect();
    const plotX = touch.clientX - rect.left - Y_AXIS_W;
    const plotW = rect.width - Y_AXIS_W - RIGHT_M;
    if (plotW <= 0) return;
    const frac = Math.max(0, Math.min(1, plotX / plotW));
    const minMs = series[0].ms;
    const maxMs = series[series.length - 1].ms;
    const ms = minMs + frac * (maxMs - minMs);
    const idx = nearestIndexByMs(series, ms);
    if (idx !== activeIdx) {
      setActiveIdx(idx);
      onScrub?.(series[idx]);
    }
  };

  return (
    <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("hr.graph.title")}
        </div>
        {active && (
          <div className="text-[10px] uppercase tracking-[0.2em] tabular font-bold">
            <span className="text-neon">{active.bpm}</span>
            <span className="text-muted-foreground"> bpm · </span>
            <span className="text-foreground">{fmtMs(active.ms)}</span>
            <span className="text-muted-foreground"> · {fmtKm(active.distM)} km</span>
          </div>
        )}
      </div>

      <div
        ref={wrapRef}
        className="mt-3 h-44 w-full select-none"
        style={chartStyle}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={handleLeave}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 6, right: RIGHT_M, bottom: 0, left: 0 }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <defs>
              <linearGradient id="hr-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NEON} stopOpacity={0.35} />
                <stop offset="100%" stopColor={NEON} stopOpacity={0} />
              </linearGradient>
              <filter id="hr-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

            <XAxis
              dataKey="ms"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) => fmtMs(v)}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              minTickGap={40}
            />
            <YAxis
              type="number"
              domain={yDomain}
              tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />

            {boundaries.map((b) => (
              <ReferenceLine
                key={b.zone}
                y={b.bpm}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="2 4"
                label={{
                  value: `Z${b.zone - 1}`,
                  position: "insideRight",
                  fill: "rgba(255,255,255,0.4)",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              />
            ))}

            <Area
              type="monotone"
              dataKey="bpm"
              stroke="none"
              fill="url(#hr-fill)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="bpm"
              stroke={NEON}
              strokeWidth={2.5}
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: NEON, stroke: "#000", strokeWidth: 1 }}
              isAnimationActive={false}
              style={{ filter: "url(#hr-glow)" }}
            />

            {active && (
              <ReferenceLine
                x={active.ms}
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={1}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Active sample detail row */}
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
        <span>{active?.paceSecPerKm ? `${formatPace(active.paceSecPerKm)} /km` : "\u00A0"}</span>
        <span>
          Z1 · Z2 · Z3 · Z4 · Z5
        </span>
      </div>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <StatCell label={t("hr.stat.max")} value={stats.maxBpm != null ? String(stats.maxBpm) : "—"} unit="bpm" />
        <StatCell label={t("hr.stat.avg")} value={stats.avgBpm != null ? String(stats.avgBpm) : "—"} unit="bpm" />
        <StatCell label={t("hr.stat.vo2")} value={vo2 != null ? vo2.toFixed(1) : "—"} unit={t("vo2.unit")} />
        <StatCell label={t("hr.stat.ef")} value={ef != null ? ef.toFixed(2) : "—"} />
      </div>
    </section>
  );
}

function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2 text-center">
      <div className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground font-bold leading-tight">
        {label}
      </div>
      <div className="mt-1 font-display font-black tabular text-base leading-none text-foreground">
        {value}
      </div>
      {unit && (
        <div className="mt-0.5 text-[8px] uppercase tracking-wider text-muted-foreground font-semibold">
          {unit}
        </div>
      )}
    </div>
  );
}
