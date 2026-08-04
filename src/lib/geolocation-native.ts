// Geolocation layer.
//
// Platform detection comes straight from Capacitor. On iOS and Android we
// always use the @capacitor/geolocation plugin (CoreLocation / Play
// Services). navigator.geolocation is only used when the platform is "web".
//
// Required iOS Info.plist keys (added in the native shell):
//   NSLocationWhenInUseUsageDescription
//   NSLocationAlwaysAndWhenInUseUsageDescription
//   UIBackgroundModes -> ["location", "audio"]
// See docs/IOS_SETUP.md for the full setup.

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

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

function getPlatform(): "ios" | "android" | "web" {
  const p = Capacitor.getPlatform();
  if (p === "ios" || p === "android") return p;
  return "web";
}

export function isNativeGeolocationAvailable(): boolean {
  return Capacitor.isNativePlatform() && getPlatform() !== "web";
}

// Single source of truth for "may we touch navigator.geolocation?".
// NEVER call navigator.geolocation without this guard — on iOS/Android the
// WKWebView would show the "localhost would like to use your location" dialog.
export function isWebPlatform(): boolean {
  return getPlatform() === "web" && !Capacitor.isNativePlatform();
}

// Race a promise against a timeout so a hung bridge surfaces as an error
// instead of freezing the UI forever.
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

// Web-only permission probe (also triggers the browser dialog).
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
    if (getPlatform() === "web") return webProbePermission();
    try {
      const cur = await withTimeout(Geolocation.checkPermissions(), 8000, "checkPermissions");
      const curState = mapState(cur?.location ?? cur?.coarseLocation);
      if (curState === "granted") return "granted";
      const res = await withTimeout(Geolocation.requestPermissions(), 30000, "requestPermissions");
      return mapState(res?.location ?? res?.coarseLocation);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[geo] native permission flow failed", (e as Error)?.message ?? e);
      return "prompt";
    }
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
  if (getPlatform() === "web") return webGetCurrentPosition(20000);
  try {
    const pos = await withTimeout(
      Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 10000,
      }),
      22000,
      "getCurrentPosition",
    );
    if (!pos) return null;
    // eslint-disable-next-line no-console
    console.log("[geo] getCurrentPosition ok", pos.coords.latitude, pos.coords.longitude, "acc", pos.coords.accuracy);
    return pos as unknown as NativePosition;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[geo] native getCurrentPosition failed", (e as Error)?.message ?? e);
    return null;
  }
}

// Watch IDs are encoded so `nativeClearWatch` knows which API to call:
//   "web:<number>" → navigator.geolocation.clearWatch(number)
//   "cap:<string>" → Geolocation.clearWatch({ id: string })
export async function nativeWatchPosition(
  onPosition: (pos: NativePosition) => void,
  onError: (err: { message: string }) => void,
): Promise<string | null> {
  if (getPlatform() === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onError({ message: "Geolocation not available" });
      return null;
    }
    try {
      const id = navigator.geolocation.watchPosition(
        (p) => {
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
          // Transient timeouts (code 3) should not surface as a hard error.
          if (err?.code === 3) return;
          onError({ message: err?.message ?? "Location error" });
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 60000 },
      );
      return `web:${id}`;
    } catch (e) {
      onError({ message: (e as Error)?.message ?? "Location error" });
      return null;
    }
  }

  try {
    const id = await withTimeout(
      Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 60000, maximumAge: 0 },
        (pos, err) => {
          if (err) {
            // eslint-disable-next-line no-console
            console.error("[geo] watch error", err?.message ?? err);
            onError({ message: err?.message ?? "Location error" });
            return;
          }
          if (pos) {
            // eslint-disable-next-line no-console
            console.log("[geo] watch fix", pos.coords.latitude, pos.coords.longitude, "acc", pos.coords.accuracy);
            onPosition(pos as unknown as NativePosition);
          }
        },
      ),
      10000,
      "watchPosition",
    );
    if (id) {
      // eslint-disable-next-line no-console
      console.log("[geo] watchPosition started cap", id);
      return `cap:${id}`;
    }
    onError({ message: "Could not start location updates" });
    return null;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[geo] native watchPosition failed", (e as Error)?.message ?? e);
    onError({ message: (e as Error)?.message ?? "Location error" });
    return null;
  }
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
  try {
    await Geolocation.clearWatch({ id: realId });
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
