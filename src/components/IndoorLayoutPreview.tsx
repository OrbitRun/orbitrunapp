// Read-only mirror of the indoor Focus Run layout, used on the "Klar til start"
// home screen so the runner sees the exact setup before they start the run.

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { METRICS, type LiveStats, type MetricId } from "@/lib/stat-metrics";
import {
  DEFAULT_INDOOR_LAYOUT,
  loadIndoorLayout,
  type IndoorLayout,
} from "@/lib/indoor-layout";

const EMPTY_STATS: LiveStats = {
  distanceM: 0,
  elapsedMs: 0,
  currentPaceSecPerKm: 0,
  avgPaceSecPerKm: 0,
  cadenceSpm: 0,
  elevationGainM: 0,
  ghostDeltaMs: null,
  hrBpm: null,
  maxHrBpm: null,
  avgHrBpm: null,
};

export default function IndoorLayoutPreview() {
  const { t: tr } = useI18n();
  const [layout, setLayout] = useState<IndoorLayout>(DEFAULT_INDOOR_LAYOUT);

  useEffect(() => {
    setLayout(loadIndoorLayout());
    const onUpdate = () => setLayout(loadIndoorLayout());
    window.addEventListener("orbit:indoor-layout-update", onUpdate);
    return () => window.removeEventListener("orbit:indoor-layout-update", onUpdate);
  }, []);

  const superHero = METRICS[layout.superHero];
  const superHeroValue = formatPlaceholder(superHero.format(EMPTY_STATS));
  const superHeroUnit = superHero.unitKey ? tr(superHero.unitKey) : "";
  const firstPage = layout.gridPages[0] ?? [];

  return (
    <div className="rounded-3xl border border-border bg-white/[0.03] px-4 py-5 flex flex-col items-center justify-center gap-4 h-[221px]">
      {/* Super hero */}
      <div className="text-center">
        <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {tr(superHero.labelKey)}
          {superHeroUnit ? ` · ${superHeroUnit.toUpperCase()}` : ""}
        </div>
        <div className="font-display font-black tabular-nums text-neon leading-none mt-1 text-[34px]">
          {superHeroValue}
        </div>
      </div>

      {/* Mini 2x2 grid (page 1) */}
      <div className="grid grid-cols-2 grid-rows-2 gap-1.5 w-full max-w-[260px]">
        {firstPage.map((id, i) => {
          const def = METRICS[id];
          const v = formatPlaceholder(def.format(EMPTY_STATS));
          const u = def.unitKey ? tr(def.unitKey) : "";
          return (
            <div
              key={`${i}-${id}`}
              className="rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 text-center"
            >
              <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground font-bold leading-none">
                {tr(def.labelKey)}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-1 leading-none">
                <span className="font-display font-black tabular-nums text-sm text-foreground">
                  {v}
                </span>
                {u && (
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground font-bold">
                    {u}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Page dots */}
      <div className="flex items-center justify-center gap-1">
        {layout.gridPages.map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full ${i === 0 ? "w-4 bg-neon" : "w-1 bg-white/25"}`}
          />
        ))}
      </div>
    </div>
  );
}

// Replace placeholder dashes / zero-ish values with a uniform em-dash so the
// preview reads as "no data yet" instead of confusing zeros.
function formatPlaceholder(v: string): string {
  if (!v || v === "0" || v === "0:00" || v === "—") return "—";
  return v;
}
