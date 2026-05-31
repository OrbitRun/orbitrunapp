// Capacitor Geolocation bridge — web-safe, native-ready, with an iOS
// WKWebView fallback.
//
// Background: `@capacitor/geolocation` 8.x can silently drop bridge messages
// on certain iOS / Xcode combinations (see
// https://github.com/ionic-team/capacitor-plugins/issues/2525), which makes
// `getCurrentPosition` / `watchPosition` promises hang forever. The
// well-known workaround is to call `navigator.geolocation` directly inside
// the WKWebView — it uses CoreLocation under the hood, honors the same
// `Info.plist` `NSLocation*` keys + `UIBackgroundModes=location`, and is
// not affected by the plugin bridge bug.
//
// Strategy:
//  - Permission prompt: try the Capacitor plugin first (it triggers the
//    iOS system dialog reliably). If the plugin call hangs or fails, fall
//    back to `navigator.geolocation.getCurrentPosition` which also prompts.
//  - Location reads / watches on iOS native: use `navigator.geolocation`
//    directly. On Android we still prefer the Capacitor plugin (no known
//    bridge issue there).
//
// Required iOS Info.plist keys (added in the native shell):
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

function getPlatform(): "ios" | "android" | "web" {
  const cap = getCapacitor();
  const p = cap?.getPlatform?.();
  if (p === "ios" || p === "android") return p;
  return "web";
}

// Lazily resolve the plugin via a literal `import()` string so Vite bundles
// it as a chunk in the iOS build.
async function loadPlugin(): Promise<unknown | null> {
  if (!isNativeGeolocationAvailable()) return null;
  try {
    const mod = await import("@capacitor/geolocation");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any;
    return m?.Geolocation ?? m?.default?.Geolocation ?? m?.default ?? null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[geo] failed to import @capacitor/geolocation", (e as Error)?.message ?? e);
    return null;
  }
}

// Race a promise against a timeout. The Capacitor iOS bridge bug manifests
// as a never-resolving promise — we cap waits so we can fall back to
// `navigator.geolocation`.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const tid = setTimeout(() => reject(new Error(`[geo] ${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(tid);
        resolve(v);
      },
      (e) => {
        clearTimeout(tid);
        reject(e);
      },
    );
  });
}

export type GeoPermissionStatus = "granted" | "denied" | "prompt" | "unavailable";

let permInflight: Promise<GeoPermissionStatus> | null = null;

function mapState(s: unknown): GeoPermissionStatus {
  if (s === "granted") return "granted";
  if (s === "denied") return "denied";
  if (s === "prompt" || s === "prompt-with-rationale") return "prompt";
  return "denied";
}

// Trigger the iOS permission dialog via `navigator.geolocation`. Resolves
// once the user answers (or the call times out). The dialog only appears
// when `NSLocationWhenInUseUsageDescription` is present in Info.plist.
function webProbePermission(timeoutMs = 12000): Promise<GeoPermissionStatus> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve("unavailable");
      return;
    }
    let settled = false;
    const tid = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve("prompt");
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(tid);
        resolve("granted");
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(tid);
        // PERMISSION_DENIED = 1
        resolve(err && err.code === 1 ? "denied" : "prompt");
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
}

export async function requestNativeGeolocationPermission(): Promise<GeoPermissionStatus> {
  if (permInflight) return permInflight;
  permInflight = (async (): Promise<GeoPermissionStatus> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugin: any = await loadPlugin();
    if (plugin) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cur: any = await withTimeout<any>(
          plugin.checkPermissions?.() ?? Promise.resolve(null),
          4000,
          "checkPermissions",
        );
        const curState = mapState(cur?.location ?? cur?.coarseLocation);
        if (curState === "granted") return "granted";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res: any = await withTimeout<any>(
          plugin.requestPermissions?.() ?? Promise.resolve(null),
          15000,
          "requestPermissions",
        );
        const next = mapState(res?.location ?? res?.coarseLocation);
        if (next === "granted" || next === "denied") return next;
        // Fall through to web probe.
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[geo] capacitor permission flow failed, falling back to navigator", (e as Error)?.message ?? e);
      }
    }
    // Fallback: trigger the iOS permission dialog via navigator.geolocation.
    return webProbePermission();
  })();
  try {
    return await permInflight;
  } finally {
    permInflight = null;
  }
}

function webGetCurrentPosition(timeoutMs: number): Promise<NativePosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        // eslint-disable-next-line no-console
        console.log("[geo] webGetCurrentPosition ok", p.coords.latitude, p.coords.longitude, "acc", p.coords.accuracy);
        resolve({
          coords: {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: p.coords.accuracy,
            altitude: p.coords.altitude,
            altitudeAccuracy: p.coords.altitudeAccuracy,
            heading: p.coords.heading,
            speed: p.coords.speed,
          },
          timestamp: p.timestamp,
        });
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[geo] webGetCurrentPosition err", err?.code, err?.message);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 5000 },
    );
  });
}

export async function nativeGetCurrentPosition(): Promise<NativePosition | null> {
  const platform = getPlatform();
  // iOS: bypass Capacitor bridge (see header comment).
  if (platform === "ios") {
    return webGetCurrentPosition(20000);
  }
  // Android / fallback: prefer Capacitor plugin.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return webGetCurrentPosition(20000);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pos: any = await withTimeout<any>(
      plugin.getCurrentPosition?.({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }) ?? Promise.resolve(null),
      22000,
      "getCurrentPosition",
    );
    if (pos) {
      // eslint-disable-next-line no-console
      console.log("[geo] getCurrentPosition ok", pos?.coords?.latitude, pos?.coords?.longitude, "acc", pos?.coords?.accuracy);
      return pos as NativePosition;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[geo] plugin getCurrentPosition failed, falling back", (e as Error)?.message ?? e);
  }
  return webGetCurrentPosition(20000);
}

// Watch IDs are encoded so `nativeClearWatch` knows which API to call:
//   "web:<number>" → navigator.geolocation.clearWatch(number)
//   "cap:<string>" → plugin.clearWatch({ id: string })
export async function nativeWatchPosition(
  onPosition: (pos: NativePosition) => void,
  onError: (err: { message: string }) => void,
): Promise<string | null> {
  const platform = getPlatform();

  const startWeb = (): string | null => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onError({ message: "Geolocation not available" });
      return null;
    }
    try {
      const id = navigator.geolocation.watchPosition(
        (p) => {
          // eslint-disable-next-line no-console
          console.log("[geo] watch fix", p.coords.latitude, p.coords.longitude, "acc", p.coords.accuracy);
          onPosition({
            coords: {
              latitude: p.coords.latitude,
              longitude: p.coords.longitude,
              accuracy: p.coords.accuracy,
              altitude: p.coords.altitude,
              altitudeAccuracy: p.coords.altitudeAccuracy,
              heading: p.coords.heading,
              speed: p.coords.speed,
            },
            timestamp: p.timestamp,
          });
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.error("[geo] watch error", err?.code, err?.message);
          // Transient timeouts (code 3) should not surface as a hard error;
          // CoreLocation will keep trying.
          if (err?.code === 3) return;
          onError({ message: err?.message ?? "Location error" });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 },
      );
      // eslint-disable-next-line no-console
      console.log("[geo] watchPosition started web", id);
      return `web:${id}`;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[geo] navigator.watchPosition threw", (e as Error)?.message ?? e);
      onError({ message: (e as Error)?.message ?? "Location error" });
      return null;
    }
  };

  if (platform === "ios") {
    return startWeb();
  }

  // Android: try plugin first, fall back to web.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return startWeb();
  try {
    const id: string = await withTimeout(
      plugin.watchPosition?.(
        { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 },
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
      ) ?? Promise.resolve(null),
      8000,
      "watchPosition",
    );
    if (id) {
      // eslint-disable-next-line no-console
      console.log("[geo] watchPosition started cap", id);
      return `cap:${id}`;
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[geo] plugin watchPosition failed, falling back", (e as Error)?.message ?? e);
  }
  return startWeb();
}

export async function nativeClearWatch(id: string): Promise<void> {
  if (!id) return;
  if (id.startsWith("web:")) {
    const n = Number(id.slice(4));
    if (typeof navigator !== "undefined" && navigator.geolocation && Number.isFinite(n)) {
      try {
        navigator.geolocation.clearWatch(n);
      } catch {
        /* noop */
      }
    }
    return;
  }
  const realId = id.startsWith("cap:") ? id.slice(4) : id;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugin: any = await loadPlugin();
  if (!plugin) return;
  try {
    await plugin.clearWatch?.({ id: realId });
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
