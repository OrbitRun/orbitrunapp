// Capacitor Geolocation bridge — web-safe, native-ready.
//
// On the web (or SSR / Cloudflare Worker) every export is a safe no-op:
// `isNativeGeolocationAvailable()` returns false, and the helpers return
// null. Inside a Capacitor iOS / Android shell with `@capacitor/geolocation`
// installed, we use the native plugin which on iOS maps to
// `kCLLocationAccuracyBestForNavigation` (`enableHighAccuracy: true`) and on
// Android to `PRIORITY_HIGH_ACCURACY`.
//
// Required iOS Info.plist keys (added in the native shell, not the web app):
//   NSLocationWhenInUseUsageDescription
//   NSLocationAlwaysAndWhenInUseUsageDescription
//   UIBackgroundModes -> ["location", "audio"]
// See docs/IOS_SETUP.md for the full setup.

export type NativePosition = {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isNativeGeolocationAvailable(): boolean {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) return false;
  const p = cap.getPlatform?.();
  return p === "ios" || p === "android";
}

// Lazily resolve the plugin so the web bundle never tries to resolve it.
async function loadPlugin(): Promise<unknown | null> {
  if (!isNativeGeolocationAvailable()) return null;
  try {
    const specifier = "@capacitor/geolocation";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await (Function(
      "s",
      "return import(s)",
    ) as (s: string) => Promise<unknown>)(specifier);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any;
    return m?.Geolocation ?? m?.default?.Geolocation ?? m?.default ?? null;
  } catch {
    return null;
  }
}

export async function requestNativeGeolocationPermission(): Promise<
  "granted" | "denied" | "unavailable"
> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return "unavailable";
  try {
    // `aliases: ["location", "coarseLocation"]` ensures both fine + coarse on
    // Android; on iOS the user is asked for "When In Use". We separately call
    // `requestPermissions` again later if we need "Always" for true background
    // tracking — iOS only escalates after the When-In-Use grant is granted.
    const res = await plugin.requestPermissions?.({
      permissions: ["location", "coarseLocation"],
    });
    const state = res?.location ?? res?.coarseLocation ?? "denied";
    return state === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export async function nativeGetCurrentPosition(): Promise<NativePosition | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return null;
  try {
    const pos = await plugin.getCurrentPosition?.({
      enableHighAccuracy: true, // iOS: kCLLocationAccuracyBestForNavigation
      timeout: 8000,
      maximumAge: 5000,
    });
    return pos ?? null;
  } catch {
    return null;
  }
}

export async function nativeWatchPosition(
  onPosition: (pos: NativePosition) => void,
  onError: (err: { message: string }) => void,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return null;
  try {
    const id: string = await plugin.watchPosition?.(
      {
        enableHighAccuracy: true, // BestForNavigation on iOS
        timeout: 10000,
        maximumAge: 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pos: any, err: any) => {
        if (err) {
          onError({ message: err?.message ?? "Location error" });
          return;
        }
        if (pos) onPosition(pos as NativePosition);
      },
    );
    return id ?? null;
  } catch (e) {
    onError({ message: (e as Error)?.message ?? "Location error" });
    return null;
  }
}

export async function nativeClearWatch(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.clearWatch?.({ id });
  } catch {
    /* noop */
  }
}

// Convert a Capacitor Position into a shape compatible with the browser
// GeolocationPosition the run tracker already consumes.
export function toBrowserPosition(p: NativePosition): GeolocationPosition {
  return {
    coords: {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      altitude: p.coords.altitude,
      altitudeAccuracy: p.coords.altitudeAccuracy,
      heading: p.coords.heading,
      speed: p.coords.speed,
      // Required by the DOM type but not used by the tracker.
      toJSON() {
        return this;
      },
    } as GeolocationCoordinates,
    timestamp: p.timestamp,
    toJSON() {
      return this;
    },
  } as GeolocationPosition;
}
