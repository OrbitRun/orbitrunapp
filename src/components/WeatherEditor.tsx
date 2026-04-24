import { useState } from "react";
import { Check, Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { z } from "zod";
import type { RunWeather } from "@/lib/run-types";
import { WEATHER_PRESETS } from "@/lib/weather";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Sun,
  Cloud,
  CloudSun,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
};

type Props = {
  initial: RunWeather | null | undefined;
  onSave: (w: RunWeather) => void;
  onCancel: () => void;
};

export default function WeatherEditor({ initial, onSave, onCancel }: Props) {
  const { t } = useI18n();
  const profile = useUserProfile();
  const isKmh = profile.windUnit === "kmh";
  const windLabel = isKmh ? "km/h" : "m/s";
  const windMax = isKmh ? 300 : 80;

  // Validation schema is unit-aware so we can give a clear error.
  const schema = z.object({
    tempC: z.number().int().min(-60).max(60),
    windDisplay: z.number().min(0).max(windMax),
    code: z.number().int().min(0).max(99),
  });

  const seed = initial ?? WEATHER_PRESETS[0];
  const initialWindDisplay = isKmh
    ? Math.round((initial?.windMs ?? 0) * 3.6)
    : (initial?.windMs ?? 0);
  const [code, setCode] = useState<number>(seed.code);
  const [tempC, setTempC] = useState<string>(String(initial?.tempC ?? 15));
  const [windDisplay, setWindDisplay] = useState<string>(String(initialWindDisplay));
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const parsed = schema.safeParse({
      tempC: Number(tempC),
      windDisplay: Number(windDisplay),
      code,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t("weather.edit.invalid"));
      return;
    }
    const preset = WEATHER_PRESETS.find((p) => p.code === parsed.data.code) ?? WEATHER_PRESETS[0];
    // Always store wind as m/s (canonical).
    const windMs = isKmh
      ? Math.round((parsed.data.windDisplay / 3.6) * 10) / 10
      : Math.round(parsed.data.windDisplay * 10) / 10;
    onSave({
      tempC: parsed.data.tempC,
      windMs,
      code: parsed.data.code,
      condition: preset.conditionKey,
      icon: preset.icon,
      capturedAt: initial?.capturedAt ?? Date.now(),
    });
  };

  return (
    <div className="glass-strong rounded-2xl p-4 mt-3 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          {t("weather.edit.title")}
        </div>
        <button
          onClick={onCancel}
          className="h-7 w-7 grid place-items-center rounded-full glass text-muted-foreground"
          aria-label={t("weather.edit.cancel")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {WEATHER_PRESETS.map((p) => {
          const Icon = ICONS[p.icon] ?? Cloud;
          const active = p.code === code;
          return (
            <button
              key={p.code}
              type="button"
              onClick={() => setCode(p.code)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 px-1 transition active:scale-95",
                active ? "bg-neon text-primary-foreground shadow-neon" : "glass text-foreground",
              )}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-center leading-tight">
                {t(p.conditionKey)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {t("weather.edit.temp")} (°C)
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={tempC}
            onChange={(e) => setTempC(e.target.value)}
            min={-60}
            max={60}
            className="mt-1 w-full rounded-xl bg-white/5 border border-border px-3 py-2 font-mono text-base tabular focus:outline-none focus:border-neon"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            {t("weather.edit.wind")} ({windLabel})
          </span>
          <input
            type="number"
            inputMode="decimal"
            step={isKmh ? "1" : "0.1"}
            value={windDisplay}
            onChange={(e) => setWindDisplay(e.target.value)}
            min={0}
            max={windMax}
            className="mt-1 w-full rounded-xl bg-white/5 border border-border px-3 py-2 font-mono text-base tabular focus:outline-none focus:border-neon"
          />
        </label>
      </div>

      {error && (
        <div className="mt-2 text-xs text-destructive font-semibold">{error}</div>
      )}

      <button
        onClick={handleSave}
        className="mt-3 w-full h-11 rounded-xl bg-neon text-primary-foreground flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.18em] shadow-neon active:scale-95 transition"
      >
        <Check className="h-4 w-4" />
        {t("weather.edit.save")}
      </button>
    </div>
  );
}
