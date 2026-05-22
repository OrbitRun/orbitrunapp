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

export type GeoPermissionStatus = "granted" | "denied" | "prompt" | "unavailable";

// Dedup concurrent permission requests. On iOS the system dialog is only
// shown for the FIRST `requestPermissions()` call — competing calls resolve
// immediately with `"prompt"` before the user has answered, which previously
// got mapped to `"denied"` and poisoned the run-tracker state.
let permInflight: Promise<GeoPermissionStatus> | null = null;

function mapState(s: unknown): GeoPermissionStatus {
  if (s === "granted") return "granted";
  if (s === "denied") return "denied";
  if (s === "prompt" || s === "prompt-with-rationale") return "prompt";
  return "denied";
}

export async function requestNativeGeolocationPermission(): Promise<GeoPermissionStatus> {
  if (permInflight) return permInflight;
  permInflight = (async (): Promise<GeoPermissionStatus> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin: any = await loadPlugin();
    if (!plugin) return "unavailable";
    try {
      // Cheap check first — if already granted we skip the dialog entirely.
      const cur = await plugin.checkPermissions?.();
      const curState = mapState(cur?.location ?? cur?.coarseLocation);
      if (curState === "granted") return "granted";
      // Call without arguments — the iOS plugin ignores `permissions` and
      // always calls `requestWhenInUseAuthorization`; passing the array
      // adds no value and risks alias-handling regressions.
      const res = await plugin.requestPermissions?.();
      return mapState(res?.location ?? res?.coarseLocation);
    } catch {
      return "denied";
    }
  })();
  try {
    return await permInflight;
  } finally {
    // Clear so a later real re-prompt (after the user toggled Settings) works.
    permInflight = null;
  }
}

export async function nativeGetCurrentPosition(): Promise<NativePosition | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) {
    // eslint-disable-next-line no-console
    console.warn("[geo] plugin unavailable (getCurrentPosition)");
    return null;
  }
  try {
    const pos = await plugin.getCurrentPosition?.({
      enableHighAccuracy: true, // iOS: kCLLocationAccuracyBestForNavigation
      timeout: 15000,
      maximumAge: 10000,
    });
    if (!pos) {
      // eslint-disable-next-line no-console
      console.warn("[geo] getCurrentPosition returned null");
    } else {
      // eslint-disable-next-line no-console
      console.log("[geo] getCurrentPosition ok", pos?.coords?.latitude, pos?.coords?.longitude, "acc", pos?.coords?.accuracy);
    }
    return pos ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[geo] getCurrentPosition threw", (e as Error)?.message ?? e);
    return null;
  }
}

export async function nativeWatchPosition(
  onPosition: (pos: NativePosition) => void,
  onError: (err: { message: string }) => void,
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) {
    onError({ message: "Geolocation plugin not available" });
    return null;
  }
  try {
    const id: string = await plugin.watchPosition?.(
      {
        enableHighAccuracy: true, // BestForNavigation on iOS
        timeout: 15000,
        maximumAge: 0,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pos: any, err: any) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error("[geo] watch error", err?.message ?? err, "code", err?.code);
          onError({ message: err?.message ?? "Location error" });
          return;
        }
        if (pos) {
          // eslint-disable-next-line no-console
          console.log("[geo] watch fix", pos?.coords?.latitude, pos?.coords?.longitude, "acc", pos?.coords?.accuracy);
          onPosition(pos as NativePosition);
        }
      },
    );
    // eslint-disable-next-line no-console
    console.log("[geo] watchPosition started", id);
    return id ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[geo] watchPosition threw", (e as Error)?.message ?? e);
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
