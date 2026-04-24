## Weather integration for runs

Capture weather conditions at the moment a run starts (temperature, wind, condition + icon), show them on the post-run summary, persist them with the run, and surface them in the history list and run detail page.

### API choice

Use **Open-Meteo** (`https://api.open-meteo.com/v1/forecast`) — free, no API key, no signup, supports CORS, returns current weather including a `weather_code` we can map to icons + labels. This avoids requiring the user to obtain and store an OpenWeather key.

If the user later prefers OpenWeather, we can swap the fetcher; the rest of the pipeline stays the same.

### Data model

Extend `Run` (in `src/lib/run-types.ts`) with an optional `weather` field so existing saved runs remain valid:

```ts
export type RunWeather = {
  tempC: number;
  windKph: number;
  code: number;          // Open-Meteo weather_code
  condition: string;     // i18n key: "weather.sunny" | "weather.rain" | ...
  icon: string;          // lucide icon name: "Sun" | "CloudRain" | ...
  capturedAt: number;    // ms
};

export type Run = {
  // ...existing fields
  weather?: RunWeather;
};
```

### Files

**New**
- `src/lib/weather.ts` — `fetchWeather(lat, lng)` calling Open-Meteo, plus `weatherCodeToMeta(code)` mapping WMO codes → `{ condition, icon }` (Sunny/Cloudy/Rain/Snow/Thunderstorm/Fog).
- `src/components/WeatherBadge.tsx` — small pill: lucide icon + temp + optional wind, used on summary, history cards, and detail page.

**Edited**
- `src/lib/run-types.ts` — add `RunWeather` type and optional `weather` on `Run`.
- `src/hooks/use-run-tracker.ts`:
  - Add `weatherRef` (RunWeather | null).
  - When the first GPS point arrives after `start()`, call `fetchWeather(lat, lng)` once and store result in `weatherRef` (silent failure → leave undefined).
  - In `stop()`, attach `weather: weatherRef.current ?? undefined` to the returned `Run`.
- `src/components/RunSummary.tsx` — render `<WeatherBadge>` under the date when `run.weather` exists.
- `src/routes/run.$id.tsx` — render `<WeatherBadge>` in the header row.
- `src/routes/history.tsx` — render a compact `<WeatherBadge variant="compact">` overlaid on each run map card (top-left).
- `src/lib/i18n.tsx` — add weather strings: `weather.sunny`, `weather.cloudy`, `weather.rain`, `weather.snow`, `weather.thunderstorm`, `weather.fog`, `weather.wind`, plus `°C` units (DA + EN).

### Flow

```text
start() → armGps() → first GPS fix (lat,lng)
                     │
                     ▼
              fetchWeather(lat,lng) → Open-Meteo
                     │
                     ▼
              weatherRef = { tempC, windKph, code, ... }
                     │
              (run continues)
                     │
                     ▼
                  stop() → Run { ..., weather }
                     │
                     ▼
        RunSummary shows WeatherBadge → save → persisted
                     │
                     ▼
        History list + run detail show WeatherBadge
```

### UX

- Badge: small glass pill with a lucide icon (`Sun`/`Cloud`/`CloudRain`/`CloudSnow`/`CloudLightning`/`CloudFog`), temperature (e.g. `12°C`), and wind speed (e.g. `8 km/h`) when relevant.
- Failure mode: if the weather fetch fails or the user blocks location, the badge is simply omitted — no error UI, no blocking of the save flow.
- Old runs without weather data continue to render normally (badge hidden).

### Notes

- Single fetch per run (not polling) — captured "at the start" as requested.
- Open-Meteo is called from the client; no secrets, no edge function needed.
- Backward compatible: `weather` is optional, existing localStorage runs keep working.
