import type { RunWeather } from "./run-types";

type WeatherMeta = {
  conditionKey: string; // i18n key
  icon: string; // lucide icon name
};

// WMO weather code → icon + i18n key
// https://open-meteo.com/en/docs (weather_code)
export function weatherCodeToMeta(code: number): WeatherMeta {
  if (code === 0) return { conditionKey: "weather.sunny", icon: "Sun" };
  if (code === 1 || code === 2) return { conditionKey: "weather.partlyCloudy", icon: "CloudSun" };
  if (code === 3) return { conditionKey: "weather.cloudy", icon: "Cloud" };
  if (code === 45 || code === 48) return { conditionKey: "weather.fog", icon: "CloudFog" };
  if (code >= 51 && code <= 57) return { conditionKey: "weather.drizzle", icon: "CloudDrizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { conditionKey: "weather.rain", icon: "CloudRain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { conditionKey: "weather.snow", icon: "CloudSnow" };
  if (code >= 95 && code <= 99) return { conditionKey: "weather.thunderstorm", icon: "CloudLightning" };
  return { conditionKey: "weather.cloudy", icon: "Cloud" };
}

export async function fetchWeather(lat: number, lng: number): Promise<RunWeather | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=ms&temperature_unit=celsius`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
      };
    };
    const c = json.current;
    if (!c || c.temperature_2m == null || c.weather_code == null) return null;
    const meta = weatherCodeToMeta(c.weather_code);
    return {
      tempC: Math.round(c.temperature_2m),
      windMs: Math.round((c.wind_speed_10m ?? 0) * 10) / 10,
      code: c.weather_code,
      condition: meta.conditionKey,
      icon: meta.icon,
      capturedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Canonical preset list for manual editing — one entry per condition we render.
export const WEATHER_PRESETS: Array<{ code: number; conditionKey: string; icon: string }> = [
  { code: 0, conditionKey: "weather.sunny", icon: "Sun" },
  { code: 2, conditionKey: "weather.partlyCloudy", icon: "CloudSun" },
  { code: 3, conditionKey: "weather.cloudy", icon: "Cloud" },
  { code: 45, conditionKey: "weather.fog", icon: "CloudFog" },
  { code: 53, conditionKey: "weather.drizzle", icon: "CloudDrizzle" },
  { code: 63, conditionKey: "weather.rain", icon: "CloudRain" },
  { code: 73, conditionKey: "weather.snow", icon: "CloudSnow" },
  { code: 95, conditionKey: "weather.thunderstorm", icon: "CloudLightning" },
];
