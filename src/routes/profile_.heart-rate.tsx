import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import ZonePacingSettings from "@/components/ZonePacingSettings";
import {
  defaultConfig,
  karvonenZones,
  loadHrZones,
  maxHrFromAge,
  saveHrZones,
  validateConfig,
  ZONE_VAR,
  type HrZoneConfig,
  type HrZoneId,
  type ZoneRange,
} from "@/lib/hr-zones-config";
import { loadVitals, saveVitals } from "@/lib/vitals";
import { isHealthAvailable, syncVitalsFromHealth } from "@/lib/health";

export const Route = createFileRoute("/profile_/heart-rate")({
  head: () => ({
    meta: [
      { title: "Heart Rate Zones — Orbit Run" },
      { name: "description", content: "Configure your personal heart rate training zones." },
    ],
  }),
  component: HeartRateSettingsPage,
});

function HeartRateSettingsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [config, setConfig] = useState<HrZoneConfig>(() => loadHrZones() ?? defaultConfig());
  const [error, setError] = useState<string | null>(null);

  // Mark fresh storage reads as changed when keys differ.
  useEffect(() => {
    const stored = loadHrZones();
    if (stored) setConfig(stored);
  }, []);

  const validation = useMemo(() => validateConfig(config), [config]);
  useEffect(() => {
    if (!validation.ok) setError(errorMessage(validation.reason, t));
    else setError(null);
  }, [validation, t]);

  const recompute = (next: Partial<HrZoneConfig>) => {
    setConfig((prev) => {
      const merged = { ...prev, ...next, source: "karvonen" as const };
      const maxHr = next.age != null ? maxHrFromAge(next.age) : merged.maxHr;
      return {
        ...merged,
        maxHr,
        zones: karvonenZones(merged.restingHr, maxHr),
      };
    });
  };

  const updateZone = (idx: number, patch: Partial<ZoneRange>) => {
    setConfig((prev) => {
      const zones = prev.zones.map((z) => ({ ...z }));
      zones[idx] = { ...zones[idx], ...patch };
      // Keep ranges contiguous: clamp neighbours.
      if (patch.upper != null && idx < 4) {
        zones[idx + 1].lower = Math.max(zones[idx].lower + 1, zones[idx].upper + 1);
      }
      if (patch.lower != null && idx > 0) {
        zones[idx - 1].upper = Math.min(zones[idx - 1].upper, zones[idx].lower - 1);
      }
      return { ...prev, source: "manual", zones };
    });
  };

  const onSave = () => {
    const result = saveHrZones(config);
    if (!result.ok) {
      setError(errorMessage(result.reason, t));
      return;
    }
    navigate({ to: "/profile" });
  };

  return (
    <main className="mx-auto max-w-md px-4 pt-4 pb-32">
      <header className="py-3 flex items-center gap-3">
        <Link
          to="/profile"
          className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-foreground hover:bg-white/10 transition"
          aria-label={t("hrz.cancel")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            {t("hrz.eyebrow")}
          </div>
          <h1 className="font-display font-black text-2xl tracking-tight">{t("hrz.title")}</h1>
        </div>
      </header>

      {/* Inputs */}
      <section className="mt-4 glass rounded-2xl p-4 space-y-3">
        <NumField
          label={t("hrz.input.age")}
          value={config.age}
          min={5}
          max={120}
          onChange={(v) => recompute({ age: v })}
        />
        <NumField
          label={t("hrz.input.resting")}
          value={config.restingHr}
          min={30}
          max={120}
          unit="bpm"
          onChange={(v) => recompute({ restingHr: v })}
        />
        <NumField
          label={t("hrz.input.max")}
          value={config.maxHr}
          min={config.restingHr + 20}
          max={230}
          unit="bpm"
          onChange={(v) =>
            setConfig((prev) => ({
              ...prev,
              source: "karvonen",
              maxHr: v,
              zones: karvonenZones(prev.restingHr, v),
            }))
          }
        />
        <button
          type="button"
          onClick={() => recompute({})}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-neon px-4 py-3 text-sm font-bold text-primary-foreground active:scale-[0.98] transition"
        >
          <Sparkles className="h-4 w-4" />
          {t("hrz.auto")}
        </button>
        <p className="text-[11px] text-muted-foreground text-center">{t("hrz.autoHint")}</p>
      </section>

      <VitalsSection />

      {/* Visual preview */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            {t("hrz.previewTitle")}
          </div>
          {config.source === "manual" && (
            <button
              type="button"
              onClick={() => recompute({})}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-bold hover:bg-white/10 transition"
            >
              <RotateCcw className="h-3 w-3" />
              {t("hrz.reset")}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {config.zones.map((z, i) => (
            <ZoneRow
              key={z.z}
              zone={z}
              prevUpper={i > 0 ? config.zones[i - 1].upper : config.restingHr}
              nextLower={i < 4 ? config.zones[i + 1].lower : config.maxHr}
              onChange={(patch) => updateZone(i, patch)}
              t={t}
            />
          ))}
        </div>
      </section>

      {/* Zone-based pacing */}
      <ZonePacingSettings />

      {error && (
        <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-0 px-4 pb-4 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
        <div className="mx-auto max-w-md grid grid-cols-2 gap-2">
          <Link
            to="/profile"
            className="rounded-xl border border-white/10 bg-white/5 py-3 text-center text-sm font-bold hover:bg-white/10 transition"
          >
            {t("hrz.cancel")}
          </Link>
          <button
            type="button"
            onClick={onSave}
            disabled={!validation.ok}
            className="rounded-xl bg-neon py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition"
          >
            {t("hrz.save")}
          </button>
        </div>
      </div>
    </main>
  );
}

function errorMessage(reason: string, t: (k: string) => string): string {
  if (reason === "age") return t("hrz.error.age");
  if (reason === "resting") return t("hrz.error.resting");
  if (reason === "max") return t("hrz.error.max");
  return t("hrz.error.zones");
}

function VitalsSection() {
  const { t } = useI18n();
  const [v, setV] = useState(() => loadVitals());
  const [rhr, setRhr] = useState<string>(v.restingHr ? String(v.restingHr) : "");
  const [hrv, setHrv] = useState<string>(v.hrvMs ? String(v.hrvMs) : "");
  const [healthAvailable, setHealthAvailable] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    setHealthAvailable(isHealthAvailable());
  }, []);

  const save = () => {
    const r = Number(rhr);
    const h = Number(hrv);
    const patch: { restingHr?: number; hrvMs?: number } = {};
    if (Number.isFinite(r) && r > 0) patch.restingHr = Math.round(r);
    if (Number.isFinite(h) && h > 0) patch.hrvMs = Math.round(h);
    if (Object.keys(patch).length === 0) return;
    const next = saveVitals(patch);
    setV(next);
  };

  const syncFromHealth = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncVitalsFromHealth();
      if (res.status !== "granted") {
        setSyncMsg(t("vitals.sync.denied"));
        return;
      }
      const patch: { restingHr?: number; hrvMs?: number } = {};
      if (res.restingHr) patch.restingHr = res.restingHr;
      if (res.hrvMs) patch.hrvMs = res.hrvMs;
      if (Object.keys(patch).length === 0) {
        setSyncMsg(t("vitals.sync.empty"));
        return;
      }
      const next = saveVitals(patch);
      setV(next);
      if (patch.restingHr) setRhr(String(patch.restingHr));
      if (patch.hrvMs) setHrv(String(patch.hrvMs));
      setSyncMsg(t("vitals.sync.ok"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="mt-4 glass rounded-2xl p-4 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold">
          {t("readiness.cta.logVitals")}
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
          {t("readiness.missing")}
        </p>
      </div>
      <label className="flex items-center gap-3">
        <span className="flex-1 text-sm font-semibold">{t("readiness.metric.restingHr")}</span>
        <input
          type="number"
          inputMode="numeric"
          value={rhr}
          placeholder="—"
          onChange={(e) => setRhr(e.target.value)}
          className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-right text-base font-bold tabular focus:outline-none focus:ring-2 focus:ring-neon/40"
        />
        <span className="text-xs text-muted-foreground font-bold w-10">{t("readiness.unit.bpm")}</span>
      </label>
      <label className="flex items-center gap-3">
        <span className="flex-1 text-sm font-semibold">{t("readiness.metric.hrv")}</span>
        <input
          type="number"
          inputMode="numeric"
          value={hrv}
          placeholder="—"
          onChange={(e) => setHrv(e.target.value)}
          className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-right text-base font-bold tabular focus:outline-none focus:ring-2 focus:ring-neon/40"
        />
        <span className="text-xs text-muted-foreground font-bold w-10">{t("readiness.unit.ms")}</span>
      </label>
      {healthAvailable && (
        <button
          type="button"
          onClick={syncFromHealth}
          disabled={syncing}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold text-foreground disabled:opacity-50 active:scale-[0.98] transition"
        >
          {syncing ? t("vitals.sync.loading") : t("vitals.sync.cta")}
        </button>
      )}
      {syncMsg && (
        <p className="text-[11px] text-muted-foreground text-center">{syncMsg}</p>
      )}
      <button
        type="button"
        onClick={save}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neon px-4 py-2.5 text-sm font-bold text-primary-foreground active:scale-[0.98] transition"
      >
        {t("hrz.save")}
      </button>
    </section>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(n)));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <label className="flex items-center gap-3">
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-20 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-right text-sm tabular font-bold focus:border-neon focus:outline-none"
      />
      {unit && <span className="text-[10px] text-muted-foreground uppercase">{unit}</span>}
    </label>
  );
}

function BoundField({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(draft);
    if (!Number.isFinite(n) || draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const clamped = Math.max(min, Math.min(max, Math.round(n)));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      value={draft}
      min={min}
      max={max}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-right text-sm tabular font-bold focus:border-neon focus:outline-none"
    />
  );
}

function ZoneRow({
  zone,
  prevUpper,
  nextLower,
  onChange,
  t,
}: {
  zone: ZoneRange;
  prevUpper: number;
  nextLower: number;
  onChange: (patch: Partial<ZoneRange>) => void;
  t: (k: string) => string;
}) {
  const z = zone.z as HrZoneId;
  return (
    <div
      className="rounded-xl border border-white/10 p-3"
      style={{ background: `color-mix(in oklch, ${ZONE_VAR[z]} 14%, transparent)` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: ZONE_VAR[z] }}
        />
        <span className="text-[10px] uppercase tracking-[0.2em] font-black">Z{z}</span>
        <span className="flex-1 text-sm font-bold truncate">{t(`hrz.zone.${z}.name`)}</span>
        <span className="text-xs tabular text-muted-foreground font-bold">
          {zone.lower}–{zone.upper} bpm
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
        {t(`hrz.zone.${z}.desc`)}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            {t("hrz.lower")}
          </span>
          <BoundField
            value={zone.lower}
            min={prevUpper + 1}
            max={zone.upper - 1}
            onChange={(n) => onChange({ lower: n })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
            {t("hrz.upper")}
          </span>
          <BoundField
            value={zone.upper}
            min={zone.lower + 1}
            max={nextLower}
            onChange={(n) => onChange({ upper: n })}
          />
        </label>
      </div>
    </div>
  );
}
