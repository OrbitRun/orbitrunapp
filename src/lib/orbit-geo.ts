import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type OrbitGeoPoint = {
  sessionId: string;
  sequence: number;
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
  start(options: { sessionId: string }): Promise<{ started: boolean; sessionId: string }>;
  stop(): Promise<{ stopped: boolean }>;
  flush(): Promise<{ points: OrbitGeoPoint[]; throughSequence: number; sessionId: string }>;
  acknowledge(options: { throughSequence: number }): Promise<{ remaining: number }>;
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

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Starts native background GPS.
 *
 * Ordering guarantees:
 * - First start: listeners → flush/replay/acknowledge → start(). start() is
 *   never called before the first flush, so leftovers can never leak into the
 *   new session.
 * - Resume: live events are queued while flush() runs; replay + queue are then
 *   merged, sorted and deduped by `sequence` before direct delivery resumes.
 * - Stop: flush → replay → acknowledge → stop, then idempotent listener removal.
 *
 * The native buffer is crash resistant on a best-effort basis; OS termination
 * or GPS/hardware failure can still lose points.
 */
export async function startOrbitGeo(
  onPosition: (pos: GeolocationPosition) => void,
  onError?: (err: { message: string }) => void,
): Promise<OrbitGeoHandle | null> {
  if (!isOrbitGeoAvailable()) return null;

  let stopped = false;
  let queueing = false;
  let liveQueue: OrbitGeoPoint[] = [];
  let lastSequence = -1;
  const seen = new Set<number>();
  const sessionId = newSessionId();

  const deliver = (points: OrbitGeoPoint[]) => {
    const sorted = [...points]
      .filter((p) => p && typeof p.sequence === "number")
      .sort((a, b) => a.sequence - b.sequence);
    for (const p of sorted) {
      if (p.sequence <= lastSequence || seen.has(p.sequence)) continue;
      seen.add(p.sequence);
      if (seen.size > 1000) {
        for (const s of seen) {
          if (s <= lastSequence) seen.delete(s);
          if (seen.size <= 500) break;
        }
      }
      lastSequence = p.sequence;
      onPosition(toBrowserGeoPosition(p));
    }
  };

  /** flush → merge with queued live points → deliver → acknowledge. */
  const drain = async () => {
    queueing = true;
    try {
      const res = await OrbitGeo.flush();
      const replay = res?.points ?? [];
      const queued = liveQueue;
      liveQueue = [];
      if (replay.length || queued.length) deliver([...replay, ...queued]);
      if (typeof res?.throughSequence === "number" && res.throughSequence >= 0) {
        await OrbitGeo.acknowledge({ throughSequence: res.throughSequence });
      }
    } catch {
      // Deliver whatever was queued so live tracking never stalls.
      const queued = liveQueue;
      liveQueue = [];
      if (queued.length) deliver(queued);
    } finally {
      queueing = false;
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

  // 1. Listeners BEFORE anything else.
  const listeners: PluginListenerHandle[] = [];
  listeners.push(
    await OrbitGeo.addListener("orbitGeoPosition", (p) => {
      if (stopped) return;
      if (queueing) liveQueue.push(p);
      else deliver([p]);
    }),
  );
  if (onError) {
    listeners.push(
      await OrbitGeo.addListener("orbitGeoError", (e) => {
        if (!stopped) onError(e);
      }),
    );
  }

  let listenersRemoved = false;
  const removeListeners = async () => {
    if (listenersRemoved) return;
    listenersRemoved = true;
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
    appListener = null;
  };

  let appListener: PluginListenerHandle | null = null;

  // 2. flush / replay / acknowledge — drains leftovers from any earlier session.
  await drain();

  // 3. start() — only now does the new session begin.
  try {
    await OrbitGeo.start({ sessionId });
  } catch (e) {
    onError?.({ message: e instanceof Error ? e.message : "Kunne ikke starte GPS." });
    await removeListeners();
    return null;
  }

  // 4. Re-drain whenever the app comes back to the foreground.
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
      if (stopped) return;
      // flush → replay → acknowledge → stop
      await drain();
      stopped = true;
      try {
        await OrbitGeo.stop();
      } catch {
        /* ignore */
      }
      await removeListeners();
    },
  };
}
