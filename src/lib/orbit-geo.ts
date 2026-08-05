// React wrapper around the native OrbitGeo Capacitor plugin (iOS).
//
// OrbitGeo uses CLLocationManager with background location updates, so fixes
// keep arriving while the screen is locked. Every fix is also buffered
// natively, so `drainSince()` can replay whatever JS missed while the WebView
// was suspended.
//
// Web and Android are untouched — see `geolocation-native.ts`.

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { NativePosition } from "@/lib/geolocation-native";

export type OrbitGeoPoint = {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number;
};

type PermissionResult = { location: string; coarseLocation?: string };

export type OrbitGeoPlugin = {
  start(options?: Record<string, never>): Promise<{ started: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  drain(options: { since: number }): Promise<{ points: OrbitGeoPoint[] }>;
  clearBuffer(): Promise<void>;
  getCurrentPosition(): Promise<Partial<OrbitGeoPoint>>;
  checkPermissions(): Promise<PermissionResult>;
  requestPermissions(options?: { always?: boolean }): Promise<PermissionResult>;
  addListener(
    event: "orbitLocation",
    cb: (point: OrbitGeoPoint) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "orbitLocationError",
    cb: (err: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
};

const OrbitGeo = registerPlugin<OrbitGeoPlugin>("OrbitGeo");

/** True only inside the native iOS shell where the Swift plugin is compiled in. */
export function isOrbitGeoAvailable(): boolean {
  try {
    return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("OrbitGeo");
  } catch {
    return false;
  }
}

export function orbitGeoToPosition(p: OrbitGeoPoint): NativePosition {
  return {
    coords: {
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      altitude: p.altitude ?? null,
      altitudeAccuracy: p.altitudeAccuracy ?? null,
      heading: p.heading ?? null,
      speed: p.speed ?? null,
    },
    timestamp: p.timestamp,
  };
}

export async function requestOrbitGeoPermission(): Promise<"granted" | "denied" | "prompt"> {
  try {
    const cur = await OrbitGeo.checkPermissions();
    if (cur?.location === "granted") return "granted";
    const res = await OrbitGeo.requestPermissions({ always: true });
    const s = res?.location;
    if (s === "granted" || s === "denied") return s;
    return "prompt";
  } catch {
    return "prompt";
  }
}

export async function startBackgroundTracking(): Promise<boolean> {
  try {
    await OrbitGeo.start();
    return true;
  } catch (e) {
    
    console.warn("[orbit-geo] start failed", (e as Error)?.message ?? e);
    return false;
  }
}

export async function stopBackgroundTracking(): Promise<void> {
  try {
    await OrbitGeo.stop();
  } catch {
    /* noop */
  }
}

export async function addLocationListener(
  onPoint: (p: OrbitGeoPoint) => void,
  onError?: (message: string) => void,
): Promise<() => void> {
  const handles: PluginListenerHandle[] = [];
  try {
    handles.push(await OrbitGeo.addListener("orbitLocation", onPoint));
    if (onError) {
      handles.push(
        await OrbitGeo.addListener("orbitLocationError", (e) =>
          onError(e?.message ?? "Location error"),
        ),
      );
    }
  } catch {
    /* noop */
  }
  return () => {
    for (const h of handles) void h.remove();
  };
}

export async function drainSince(since: number): Promise<OrbitGeoPoint[]> {
  try {
    const res = await OrbitGeo.drain({ since });
    return res?.points ?? [];
  } catch {
    return [];
  }
}

export async function clearOrbitGeoBuffer(): Promise<void> {
  try {
    await OrbitGeo.clearBuffer();
  } catch {
    /* noop */
  }
}

export async function orbitGeoCurrentPosition(): Promise<NativePosition | null> {
  try {
    const p = await OrbitGeo.getCurrentPosition();
    if (!p || typeof p.latitude !== "number" || typeof p.longitude !== "number") return null;
    return orbitGeoToPosition(p as OrbitGeoPoint);
  } catch {
    return null;
  }
}
