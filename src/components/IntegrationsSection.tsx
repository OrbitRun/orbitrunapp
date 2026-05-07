import { useEffect, useState } from "react";
import { Activity, Check, Footprints, Heart, Watch } from "lucide-react";
import {
  isHealthAvailable,
  requestHealthPermissions,
  type HealthPermissionStatus,
} from "@/lib/health";
import { useI18n } from "@/lib/i18n";

type Row = {
  key: "appleHealth" | "garmin" | "strava" | "fitbit";
  label: string;
  Icon: typeof Activity;
  active: boolean;
};

export default function IntegrationsSection() {
  const { t } = useI18n();
  const healthAvailable = isHealthAvailable();
  const [status, setStatus] = useState<HealthPermissionStatus>(
    healthAvailable ? "denied" : "unavailable",
  );

  useEffect(() => {
    if (!healthAvailable) return;
    // Optimistic: vitals auto-sync hook already requests on mount.
  }, [healthAvailable]);

  const rows: Row[] = [
    { key: "appleHealth", label: t("integrations.appleHealth"), Icon: Heart, active: true },
    { key: "garmin", label: t("integrations.garmin"), Icon: Watch, active: false },
    { key: "strava", label: t("integrations.strava"), Icon: Activity, active: false },
    { key: "fitbit", label: t("integrations.fitbit"), Icon: Footprints, active: false },
  ];

  const handleHealth = async () => {
    if (!healthAvailable) return;
    const r = await requestHealthPermissions();
    setStatus(r);
  };

  return (
    <section className="mt-4">
      <div className="mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
        {t("integrations.title")}
      </div>
      <div className="glass rounded-2xl divide-y divide-border">
        {rows.map(({ key, label, Icon, active }) => {
          const isHealth = key === "appleHealth";
          const stateText = isHealth
            ? !healthAvailable
              ? "iOS"
              : status === "granted"
                ? t("integrations.connected")
                : t("integrations.tapToAllow")
            : t("integrations.comingSoon");
          return (
            <button
              key={key}
              type="button"
              disabled={!active}
              onClick={isHealth ? handleHealth : undefined}
              className="w-full flex items-center gap-3 px-4 py-3 text-left transition disabled:opacity-50 enabled:hover:bg-white/5"
            >
              <div
                className={`h-9 w-9 rounded-xl grid place-items-center ${
                  active ? "bg-white/5 text-neon" : "bg-white/[0.03] text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 text-sm font-semibold flex items-center gap-2">
                <span>{label}</span>
                {isHealth && status === "granted" && (
                  <Check className="h-3.5 w-3.5 text-neon" />
                )}
              </div>
              <div
                className={`text-[10px] uppercase tracking-[0.14em] font-bold ${
                  active && status === "granted" && isHealth
                    ? "text-neon"
                    : "text-muted-foreground"
                }`}
              >
                {stateText}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
