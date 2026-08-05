// React wrapper around the native OrbitGeo Capacitor plugin (iOS).
//
// OrbitGeo uses CLLocationManager with background location updates, so fixes
// keep arriving while the screen is locked. Every fix is also buffered
// natively, so `drainSince()` can replay whatever JS missed while the WebView
// was suspended. Events are NOT retained natively — the buffer is the single
// authoritative source for missed points, which avoids double-counting.
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
  /** 50–100 m fix: usable for GPS status, not for distance maths. */
  lowQuality?: boolean;
};

/** iOS distinguishes "Always" from "While Using" — a run app needs "always". */
export type OrbitGeoAuth = "always" | "whenInUse" | "denied" | "prompt";

type PermissionResult = { location: OrbitGeoAuth; coarseLocation?: OrbitGeoAuth };

export type OrbitGeoStartResult = {
  started: boolean;
  requiresAlwaysPermission?: boolean;
  denied?: boolean;
  permission?: OrbitGeoAuth;
};

export type OrbitGeoPlugin = {
  start(options?: Record<string, never>): Promise<OrbitGeoStartResult>;
  stop(): Promise<{ stopped: boolean }>;
  drain(options: { since: number; acknowledgeThrough?: number }): Promise<{
    points: OrbitGeoPoint[];
  }>;
  acknowledge(options: { through: number }): Promise<{ remaining: number }>;
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
  addListener(
    event: "orbitAuthChange",
    cb: (e: { status: OrbitGeoAuth }) => void,
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

export async function checkOrbitGeoPermission(): Promise<OrbitGeoAuth> {
  try {
    const cur = await OrbitGeo.checkPermissions();
    return cur?.location ?? "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Resolves only once iOS has reported a final status — including the
 * When-In-Use → Always upgrade, which is a second system prompt.
 */
export async function requestOrbitGeoPermission(): Promise<OrbitGeoAuth> {
  try {
    const cur = await OrbitGeo.checkPermissions();
    if (cur?.location === "always") return "always";
    if (cur?.location === "denied") return "denied";
    const res = await OrbitGeo.requestPermissions({ always: true });
    return res?.location ?? "prompt";
  } catch {
    return "prompt";
  }
}

export async function startBackgroundTracking(): Promise<OrbitGeoStartResult> {
  try {
    const res = await OrbitGeo.start();
    return res ?? { started: false };
  } catch (e) {
    console.warn("[orbit-geo] start failed", (e as Error)?.message ?? e);
    return { started: false };
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
  onAuthChange?: (status: OrbitGeoAuth) => void,
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
    if (onAuthChange) {
      handles.push(
        await OrbitGeo.addListener("orbitAuthChange", (e) => onAuthChange(e?.status ?? "prompt")),
      );
    }
  } catch {
    /* noop */
  }
  return () => {
    for (const h of handles) void h.remove();
  };
}

/**
 * Returns everything buffered after `since`, optionally dropping every point
 * up to and including `acknowledgeThrough` so the native buffer stays small.
 */
export async function drainSince(
  since: number,
  acknowledgeThrough?: number,
): Promise<OrbitGeoPoint[]> {
  try {
    const res = await OrbitGeo.drain(
      acknowledgeThrough != null ? { since, acknowledgeThrough } : { since },
    );
    return res?.points ?? [];
  } catch {
    return [];
  }
}

export async function acknowledgeOrbitGeoThrough(through: number): Promise<void> {
  try {
    await OrbitGeo.acknowledge({ through });
  } catch {
    /* noop */
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

/** Opens iOS Settings → Orbit Run so the user can switch Location to "Always". */
export async function openAppLocationSettings(): Promise<void> {
  try {
    const { App } = await import("@capacitor/app");
    await App.openUrl({ url: "app-settings:" });
  } catch {
    /* noop */
  }
}
