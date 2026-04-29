import { useI18n } from "@/lib/i18n";
import type { ZoneSlice } from "@/lib/hr-zones";
import { ZONE_VAR } from "@/lib/hr-zones-config";

type Props = {
  slices: ZoneSlice[];
  size?: number;
};

// SVG donut chart for time-in-zone breakdown.
// Center label shows the dominant zone for at-a-glance reading.
export default function HrZoneDonut({ slices, size = 120 }: Props) {
  const { t } = useI18n();
  const total = slices.reduce((a, b) => a + b.ms, 0);
  if (total <= 0) return null;

  const stroke = Math.round(size * 0.18);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  // Dominant zone for the center.
  const dominant = [...slices].sort((a, b) => b.ms - a.ms)[0];

  let offset = 0;
  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={t("zones.title")}>
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Arcs */}
        {slices.map((sl) => {
          if (sl.pct <= 0) return null;
          const len = (sl.pct / 100) * c;
          const dasharray = `${len} ${c - len}`;
          const dashoffset = -offset;
          offset += len;
          return (
            <circle
              key={sl.zone}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ZONE_VAR[sl.zone]}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={dasharray}
              strokeDashoffset={dashoffset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
        })}
        {/* Center label */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-foreground font-display font-black"
          style={{ fontSize: Math.round(size * 0.22) }}
        >
          Z{dominant.zone}
        </text>
        <text
          x={cx}
          y={cy + Math.round(size * 0.14)}
          textAnchor="middle"
          className="fill-muted-foreground font-bold"
          style={{ fontSize: Math.round(size * 0.09), letterSpacing: "0.2em" }}
        >
          {`${dominant.pct.toFixed(0)}%`}
        </text>
      </svg>
    </div>
  );
}
