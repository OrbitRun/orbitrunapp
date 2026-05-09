// Capacitor background-geolocation bridge.
//
// Wraps `@capacitor-community/background-geolocation` with the same web-safe
// dynamic-import pattern used in geolocation-native.ts. On the web (or any
// non-iOS/Android platform) every export is a no-op so the bundle never
// tries to resolve the native plugin at runtime.
//
// On iOS the plugin keeps high-accuracy GPS streaming while the screen is
// locked or the app is backgrounded — provided UIBackgroundModes contains
// `location` and the user has granted "Always" location permission. See
// docs/IOS_SETUP.md.

import type { NativePosition } from "@/lib/geolocation-native";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isBackgroundGeolocationAvailable(): boolean {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) return false;
  const p = cap.getPlatform?.();
  return p === "ios" || p === "android";
}

type BgGeoPlugin = {
  addWatcher: (
    opts: {
      backgroundMessage?: string;
      backgroundTitle?: string;
      requestPermissions?: boolean;
      stale?: boolean;
      distanceFilter?: number;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb: (location: any, error?: { code: string; message: string }) => void,
  ) => Promise<string>;
  removeWatcher: (opts: { id: string }) => Promise<void>;
};

let pluginPromise: Promise<BgGeoPlugin | null> | null = null;
async function loadPlugin(): Promise<BgGeoPlugin | null> {
  if (!isBackgroundGeolocationAvailable()) return null;
  if (pluginPromise) return pluginPromise;
  pluginPromise = (async () => {
    try {
      const specifier = "@capacitor-community/background-geolocation";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await (Function("s", "return import(s)") as (s: string) => Promise<unknown>)(
        specifier,
      );
      return (mod?.BackgroundGeolocation ??
        mod?.default?.BackgroundGeolocation ??
        mod?.default ??
        null) as BgGeoPlugin | null;
    } catch {
      return null;
    }
  })();
  return pluginPromise;
}

export async function startBackgroundWatch(
  onPosition: (pos: NativePosition) => void,
  onError: (err: { message: string }) => void,
): Promise<string | null> {
  const plugin = await loadPlugin();
  if (!plugin) return null;
  try {
    const id = await plugin.addWatcher(
      {
        backgroundMessage: "Orbit Run tracker din løbetur",
        backgroundTitle: "Orbit Run kører i baggrunden",
        requestPermissions: true,
        stale: false,
        distanceFilter: 5,
      },
      (location, error) => {
        if (error) {
          onError({ message: error.message ?? "Background location error" });
          return;
        }
        if (!location) return;
        onPosition({
          coords: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy ?? 0,
            altitude: location.altitude ?? null,
            altitudeAccuracy: location.altitudeAccuracy ?? null,
            heading: location.bearing ?? null,
            speed: location.speed ?? null,
          },
          timestamp: location.time ?? Date.now(),
        });
      },
    );
    return id ?? null;
  } catch (e) {
    onError({ message: (e as Error)?.message ?? "Background location error" });
    return null;
  }
}

export async function stopBackgroundWatch(id: string): Promise<void> {
  const plugin = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.removeWatcher({ id });
  } catch {
    /* noop */
  }
}
