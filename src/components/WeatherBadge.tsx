import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Wind } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RunWeather } from "@/lib/run-types";
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
  weather: RunWeather;
  variant?: "default" | "compact";
  className?: string;
};

export default function WeatherBadge({ weather, variant = "default", className }: Props) {
  const { t } = useI18n();
  const Icon = ICONS[weather.icon] ?? Cloud;
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full glass-strong",
        compact ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
        className,
      )}
      aria-label={`${t(weather.condition)} ${weather.tempC}°C`}
    >
      <Icon className={compact ? "h-3 w-3 text-neon" : "h-3.5 w-3.5 text-neon"} />
      <span className="font-bold tabular">{weather.tempC}°C</span>
      {!compact && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground font-semibold">{t(weather.condition)}</span>
          {weather.windKph > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground font-semibold">
                <Wind className="h-3 w-3" />
                {weather.windKph} {t("weather.windUnit")}
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}
