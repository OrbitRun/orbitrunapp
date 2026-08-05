import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type OrbitGeoPoint = {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  altitudeAccuracy: number;
  speed: number;
  heading: number;
};

type OrbitGeoPlugin = {
  checkPermissions(): Promise<{ location: string }>;
  requestPermissions(): Promise<{ location: string }>;
  start(): Promise<{ started: boolean }>;
  stop(): Promise<{ stopped: boolean }>;
  flush(): Promise<{ points: OrbitGeoPoint[]; through: number }>;
  acknowledge(options: { through: number }): Promise<{ remaining: number }>;
  addListener(
    event: "orbitGeoPosition",
    cb: (point: OrbitGeoPoint) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: "orbitGeoError",
    cb: (err: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
};

const OrbitGeo = registerPlugin<OrbitGeoPlugin>("OrbitGeo");

export function isOrbitGeoAvailable(): boolean {
  try {
    return Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("OrbitGeo");
  } catch {
    return false;
  }
}

/** Converts a native point to the browser GeolocationPosition shape. */
export function toBrowserGeoPosition(p: OrbitGeoPoint): GeolocationPosition {
  return {
    coords: {
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      altitude: p.altitude ?? null,
      altitudeAccuracy: p.altitudeAccuracy ?? null,
      heading: p.heading ?? null,
      speed: p.speed ?? null,
      toJSON() {
        return this;
      },
    },
    timestamp: p.timestamp,
    toJSON() {
      return this;
    },
  } as unknown as GeolocationPosition;
}

export type OrbitGeoHandle = {
  stop: () => Promise<void>;
};

/**
 * Starts native background GPS.
 *
 * Order matters: permission → attach listener → start() → flush/replay/ack,
 * so no live or buffered fix can be dropped between the calls.
 *
 * Live and replayed points are merged into one strictly increasing,
 * duplicate-free stream (sorted + deduped by timestamp).
 */
export async function startOrbitGeo(
  onPosition: (pos: GeolocationPosition) => void,
  onError?: (err: { message: string }) => void,
): Promise<OrbitGeoHandle | null> {
  if (!isOrbitGeoAvailable()) return null;

  let stopped = false;
  let lastTs = 0;
  const recent = new Set<number>();

  const emit = (points: OrbitGeoPoint[]) => {
    const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
    for (const p of sorted) {
      if (!p || typeof p.timestamp !== "number") continue;
      if (p.timestamp < lastTs || recent.has(p.timestamp)) continue;
      recent.add(p.timestamp);
      if (recent.size > 500) {
        // Trim oldest entries — anything older than lastTs is already filtered.
        for (const ts of recent) {
          if (ts < lastTs) recent.delete(ts);
          if (recent.size <= 250) break;
        }
      }
      lastTs = p.timestamp;
      onPosition(toBrowserGeoPosition(p));
    }
  };

  const drain = async () => {
    try {
      const res = await OrbitGeo.flush();
      if (res?.points?.length) {
        emit(res.points);
        await OrbitGeo.acknowledge({ through: res.through });
      }
    } catch {
      /* ignore */
    }
  };

  try {
    const perm = await OrbitGeo.requestPermissions();
    if (perm?.location === "denied") {
      onError?.({ message: "Location permission denied." });
      return null;
    }
  } catch {
    /* continue — start() reports a real failure */
  }

  // 1. Listeners BEFORE start()
  const listeners: PluginListenerHandle[] = [];
  listeners.push(
    await OrbitGeo.addListener("orbitGeoPosition", (p) => {
      if (!stopped) emit([p]);
    }),
  );
  if (onError) {
    listeners.push(
      await OrbitGeo.addListener("orbitGeoError", (e) => {
        if (!stopped) onError(e);
      }),
    );
  }

  // 2. start()
  try {
    await OrbitGeo.start();
  } catch (e) {
    onError?.({ message: e instanceof Error ? e.message : "Kunne ikke starte GPS." });
    for (const l of listeners) await l.remove();
    return null;
  }

  // 3. Replay anything buffered (previous background session / cold start)
  await drain();

  // 4. Re-drain whenever the app comes back to the foreground
  let appListener: PluginListenerHandle | null = null;
  try {
    const { App } = await import("@capacitor/app");
    appListener = await App.addListener("appStateChange", ({ isActive }) => {
      if (isActive && !stopped) void drain();
    });
  } catch {
    /* @capacitor/app unavailable — live stream still works */
  }

  return {
    stop: async () => {
      stopped = true;
      try {
        await drain();
      } catch {
        /* ignore */
      }
      try {
        await OrbitGeo.stop();
      } catch {
        /* ignore */
      }
      for (const l of listeners) {
        try {
          await l.remove();
        } catch {
          /* ignore */
        }
      }
      try {
        await appListener?.remove();
      } catch {
        /* ignore */
      }
    },
  };
}
