import { Headphones, Mic, Pause, Satellite } from "lucide-react";
import { useEffect, useState } from "react";
import NeonToggle from "@/components/NeonToggle";
import { loadSettings, updateSettings } from "@/lib/settings";
import { useI18n } from "@/lib/i18n";

type Props = {
  gpsActive: boolean;
  gpsAccuracy?: number | null; // meters
};

/**
 * Live telemetry bar shown on the run dashboard.
 * Groups GPS · Music · Voice · Auto-Pause into a single unified card.
 */
export default function StatusBar({ gpsActive, gpsAccuracy }: Props) {
  const { t } = useI18n();
  const [autoPause, setAutoPause] = useState(true);
  const [cueIntervalKm, setCueIntervalKm] = useState<0.5 | 1>(1);

  useEffect(() => {
    const sync = () => {
      const s = loadSettings();
      setAutoPause(s.autoPause);
      setCueIntervalKm(s.cueIntervalKm);
    };
    sync();
    window.addEventListener("orbit:settings-change", sync);
    return () => window.removeEventListener("orbit:settings-change", sync);
  }, []);

  const gpsLabel = gpsActive
    ? gpsAccuracy != null
      ? `±${Math.round(gpsAccuracy)}m`
      : t("status.gps.live")
    : t("status.gps.idle");

  const voiceLabel = cueIntervalKm === 0.5 ? t("status.voice.500m") : t("status.voice.1km");

  return (
    <section className="mt-3 glass-strong rounded-2xl p-3">
      <div className="flex items-center justify-between gap-2 px-1 pb-2">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-bold">
          {t("status.telemetry")}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${gpsActive ? "bg-neon shadow-neon" : "bg-muted-foreground/40"}`} />
          <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            {t("status.live")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* GPS */}
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 min-w-0">
          <div className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center ${gpsActive ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
            <Satellite className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{t("status.gps")}</div>
            <div className="text-[11px] font-bold tabular truncate">{gpsLabel}</div>
          </div>
        </div>

        {/* Music */}
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-white/5 grid place-items-center text-neon">
            <Headphones className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{t("status.music")}</div>
            <div className="text-[11px] font-bold truncate">{t("status.music.value")}</div>
          </div>
        </div>

        {/* Voice */}
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 min-w-0">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-white/5 grid place-items-center text-neon">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{t("status.voice")}</div>
            <div className="text-[11px] font-bold tabular truncate">{voiceLabel}</div>
          </div>
        </div>

        {/* Auto-Pause toggle */}
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 min-w-0">
          <div className={`h-7 w-7 shrink-0 rounded-lg grid place-items-center ${autoPause ? "bg-neon/15 text-neon" : "bg-white/5 text-muted-foreground"}`}>
            <Pause className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{t("settings.autoPause")}</div>
            <div className="text-[11px] font-bold truncate">
              {autoPause ? t("settings.on") : t("settings.off")}
            </div>
          </div>
          <NeonToggle
            checked={autoPause}
            size="sm"
            ariaLabel={t("settings.autoPause")}
            onChange={(v) => {
              setAutoPause(v);
              updateSettings({ autoPause: v });
            }}
          />
        </div>
      </div>
    </section>
  );
}
