// Lightweight weather snapshot using Open-Meteo (no API key required).
// Saved on each run so history can display conditions.

export type WeatherSnapshot = {
  tempC: number;
  code: number; // WMO weather code
  label: string; // localized short label
  icon: string; // emoji fallback (works without external icon libs)
};

const WMO: Record<number, { en: string; da: string; icon: string }> = {
  0: { en: "Clear", da: "Klart", icon: "☀️" },
  1: { en: "Mostly clear", da: "Næsten klart", icon: "🌤️" },
  2: { en: "Partly cloudy", da: "Delvist skyet", icon: "⛅" },
  3: { en: "Overcast", da: "Overskyet", icon: "☁️" },
  45: { en: "Fog", da: "Tåge", icon: "🌫️" },
  48: { en: "Fog", da: "Tåge", icon: "🌫️" },
  51: { en: "Drizzle", da: "Støvregn", icon: "🌦️" },
  53: { en: "Drizzle", da: "Støvregn", icon: "🌦️" },
  55: { en: "Drizzle", da: "Støvregn", icon: "🌦️" },
  61: { en: "Rain", da: "Regn", icon: "🌧️" },
  63: { en: "Rain", da: "Regn", icon: "🌧️" },
  65: { en: "Heavy rain", da: "Kraftig regn", icon: "🌧️" },
  71: { en: "Snow", da: "Sne", icon: "🌨️" },
  73: { en: "Snow", da: "Sne", icon: "🌨️" },
  75: { en: "Heavy snow", da: "Kraftig sne", icon: "❄️" },
  80: { en: "Showers", da: "Byger", icon: "🌦️" },
  81: { en: "Showers", da: "Byger", icon: "🌦️" },
  82: { en: "Heavy showers", da: "Kraftige byger", icon: "⛈️" },
  95: { en: "Thunder", da: "Torden", icon: "⛈️" },
  96: { en: "Thunder", da: "Torden", icon: "⛈️" },
  99: { en: "Thunder", da: "Torden", icon: "⛈️" },
};

export function describeWeather(code: number, lang: "en" | "da"): { label: string; icon: string } {
  const w = WMO[code] ?? { en: "—", da: "—", icon: "🌡️" };
  return { label: lang === "da" ? w.da : w.en, icon: w.icon };
}

export async function fetchWeather(lat: number, lng: number, lang: "en" | "da" = "en"): Promise<WeatherSnapshot | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const tempC = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof tempC !== "number" || typeof code !== "number") return null;
    const { label, icon } = describeWeather(code, lang);
    return { tempC: Math.round(tempC), code, label, icon };
  } catch {
    return null;
  }
}
