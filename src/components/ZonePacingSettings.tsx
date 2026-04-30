import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Sparkles, Target } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ZONE_VAR, type HrZoneId } from "@/lib/hr-zones-config";
import { formatPace } from "@/lib/run-utils";
import { loadRuns } from "@/lib/run-types";
import {
  clampBase,
  clampOffset,
  defaultPacingConfig,
  loadZonePacing,
  recentMedianPace,
  saveZonePacing,
  targetForZone,
  type ZonePacingConfig,
} from "@/lib/zone-pacing";

const ZONE_IDS: HrZoneId[] = [1, 2, 3, 4, 5];

export default function ZonePacingSettings() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<ZonePacingConfig>(() => loadZonePacing());

  useEffect(() => {
    setCfg(loadZonePacing());
  }, []);

  const recentMedian = useMemo(() => {
    if (typeof window === "undefined") return null;
    const runs = loadRuns().slice(0, 10);
    return recentMedianPace(runs.map((r) => r.avgPaceSecPerKm));
  }, []);

  const update = (patch: Partial<ZonePacingConfig>) => {
    setCfg((prev) => {
      const next = { ...prev, ...patch };
      saveZonePacing(next);
      return next;
    });
  };

  const updateOffset = (zone: HrZoneId, value: number) => {
    setCfg((prev) => {
      const offsets = { ...prev.offsets, [zone]: clampOffset(value) };
      const next = { ...prev, offsets };
      saveZonePacing(next);
      return next;
    });
  };

  const onReset = () => {
    const next = { ...defaultPacingConfig(cfg.baseSecPerKm), enabled: cfg.enabled };
    saveZonePacing(next);
    setCfg(next);
  };

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <Target className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {t("pacing.title")}
          </div>
          <div className="text-[11px] text-muted-foreground leading-snug">
            {t("pacing.subtitle")}
          </div>
        </div>
        <Toggle
          checked={cfg.enabled}
          onChange={(v) => update({ enabled: v })}
          ariaLabel={t("pacing.enable")}
        />
      </div>

      {cfg.enabled && (
        <>
          {/* Base pace */}
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold">{t("pacing.basePace")}</div>
                <div className="text-[10px] text-muted-foreground">
                  {t("pacing.basePaceHint")}
                </div>
              </div>
              <PaceField
                value={cfg.baseSecPerKm}
                onChange={(v) => update({ baseSecPerKm: clampBase(v) })}
              />
            </div>
            {recentMedian != null && recentMedian !== cfg.baseSecPerKm && (
              <button
                type="button"
                onClick={() => update({ baseSecPerKm: clampBase(recentMedian) })}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-bold hover:bg-white/10 transition"
              >
                <Sparkles className="h-3 w-3" />
                {t("pacing.useRecent")} · {formatPace(recentMedian)}
              </button>
            )}
          </div>

          {/* Per-zone offsets */}
          <div className="mt-3 space-y-2">
            {ZONE_IDS.map((z) => {
              const target = targetForZone(z, cfg);
              const color = ZONE_VAR[z];
              return (
                <div
                  key={z}
                  className="rounded-xl border border-white/10 p-3"
                  style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">
                      Z{z}
                    </span>
                    <span className="flex-1 text-sm font-bold truncate">
                      {t(`hrz.zone.${z}.name`)}
                    </span>
                    <span className="text-xs tabular text-muted-foreground font-bold">
                      {formatPace(target.lower)}–{formatPace(target.upper)}/km
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="range"
                      min={-120}
                      max={180}
                      step={5}
                      value={cfg.offsets[z]}
                      onChange={(e) => updateOffset(z, Number(e.target.value))}
                      className="flex-1 accent-neon"
                      aria-label={`${t("pacing.offset")} Z${z}`}
                    />
                    <span className="w-16 text-right text-xs tabular font-bold">
                      {cfg.offsets[z] > 0 ? "+" : ""}
                      {cfg.offsets[z]}s
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold hover:bg-white/10 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("pacing.reset")}
          </button>
        </>
      )}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${
        checked ? "bg-neon" : "bg-white/10"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function PaceField({
  value,
  onChange,
}: {
  value: number;
  onChange: (sec: number) => void;
}) {
  const [draft, setDraft] = useState(formatPace(value));
  useEffect(() => setDraft(formatPace(value)), [value]);

  const commit = (raw: string) => {
    const m = raw.trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) {
      setDraft(formatPace(value));
      return;
    }
    const sec = Number(m[1]) * 60 + Number(m[2]);
    onChange(sec);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="m:ss"
      className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-right text-sm tabular font-bold focus:border-neon focus:outline-none"
    />
  );
}
