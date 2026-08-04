// Fetches current outdoor env (temp, humidity, apparent temp, wind) from
// Open-Meteo for the user's last known location. Cached for 30 min.

import { useEffect, useState } from "react";
import { loadRuns } from "@/lib/run-types";
import { nativeRequest } from "@/lib/native-http";
import { isWebPlatform } from "@/lib/geolocation-native";

export type CurrentEnv = {
  tempC: number;
  apparentTempC: number;
  humidityPct: number;
  windMs: number;
  capturedAt: number;
};

const CACHE_KEY = "orbit:env:v1";
const TTL_MS = 30 * 60 * 1000;

function readCache(): CurrentEnv | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentEnv;
    if (Date.now() - parsed.capturedAt > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(env: CurrentEnv) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(env));
  } catch {
    /* noop */
  }
}

async function fetchEnv(lat: number, lng: number): Promise<CurrentEnv | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&wind_speed_unit=ms&temperature_unit=celsius`;
    const res = await nativeRequest(url);
    if (!res.ok) return null;
    const j = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
      };
    };
    const c = j.current;
    if (!c || c.temperature_2m == null) return null;
    return {
      tempC: Math.round(c.temperature_2m),
      apparentTempC: Math.round(c.apparent_temperature ?? c.temperature_2m),
      humidityPct: Math.round(c.relative_humidity_2m ?? 0),
      windMs: Math.round((c.wind_speed_10m ?? 0) * 10) / 10,
      capturedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

export function useCurrentEnv(): CurrentEnv | null {
  const [env, setEnv] = useState<CurrentEnv | null>(() => readCache());
  useEffect(() => {
    if (env) return;
    const runs = loadRuns();
    let lat: number | null = null;
    let lng: number | null = null;
    for (const r of runs) {
      const last = r.points?.[r.points.length - 1];
      if (last) {
        lat = last.lat;
        lng = last.lng;
        break;
      }
    }
    if (lat == null || lng == null) {
      // Web only: silent fallback probe. On native we never touch
      // navigator.geolocation — that would trigger the WKWebView location
      // dialog without the user asking for it.
      if (isWebPlatform() && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            void fetchEnv(pos.coords.latitude, pos.coords.longitude).then((e) => {
              if (e) {
                writeCache(e);
                setEnv(e);
              }
            });
          },
          () => {},
          { maximumAge: 60 * 60 * 1000, timeout: 4000 },
        );
      }
      return;
    }
    void fetchEnv(lat, lng).then((e) => {
      if (e) {
        writeCache(e);
        setEnv(e);
      }
    });
  }, [env]);
  return env;
}
