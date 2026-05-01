// Native BLE heart-rate client (Capacitor).
//
// Wraps @capacitor-community/bluetooth-le and exposes connect/disconnect +
// subscription helpers that match heart-rate-bt.ts so the façade can swap
// transports transparently. Web bundle never imports the plugin statically —
// the dynamic import is hidden from Vite the same way src/lib/health.ts hides
// the HealthKit plugin.

import type { BtHrState } from "@/lib/heart-rate-bt";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
};

function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Capacitor?: CapacitorGlobal };
  return w.Capacitor ?? null;
}

export function isNativeBleAvailable(): boolean {
  const cap = getCapacitor();
  if (!cap?.isNativePlatform?.()) return false;
  // Plugin supports iOS + Android; we currently ship iOS only, but no harm
  // letting Android wrappers use it later.
  const p = cap.getPlatform?.();
  return p === "ios" || p === "android";
}

const HEART_RATE_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb";
const HEART_RATE_MEASUREMENT = "00002a37-0000-1000-8000-00805f9b34fb";
const BATTERY_SERVICE = "0000180f-0000-1000-8000-00805f9b34fb";
const BATTERY_LEVEL = "00002a19-0000-1000-8000-00805f9b34fb";

const LS_KEY = "orbit:ble-native:last-device";

type BleClientType = {
  initialize: (opts?: { androidNeverForLocation?: boolean }) => Promise<void>;
  requestDevice: (opts: { services: string[]; optionalServices?: string[] }) => Promise<{ deviceId: string; name?: string }>;
  connect: (deviceId: string, onDisconnect?: (id: string) => void) => Promise<void>;
  disconnect: (deviceId: string) => Promise<void>;
  startNotifications: (
    deviceId: string,
    service: string,
    characteristic: string,
    cb: (value: DataView) => void,
  ) => Promise<void>;
  stopNotifications: (deviceId: string, service: string, characteristic: string) => Promise<void>;
  read: (deviceId: string, service: string, characteristic: string) => Promise<DataView>;
};

let pluginPromise: Promise<BleClientType | null> | null = null;
async function loadPlugin(): Promise<BleClientType | null> {
  if (!isNativeBleAvailable()) return null;
  if (pluginPromise) return pluginPromise;
  pluginPromise = (async () => {
    try {
      const specifier = "@capacitor-community/bluetooth-le";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await (Function("s", "return import(s)") as (s: string) => Promise<unknown>)(
        specifier,
      );
      const client: BleClientType | undefined = mod?.BleClient ?? mod?.default?.BleClient;
      if (!client) return null;
      try {
        await client.initialize({ androidNeverForLocation: true });
      } catch {
        /* already initialized */
      }
      return client;
    } catch {
      return null;
    }
  })();
  return pluginPromise;
}

type Listener = (s: BtHrState) => void;
const listeners = new Set<Listener>();

let state: BtHrState = {
  status: "idle",
  deviceName: null,
  deviceId: null,
  bpm: null,
  battery: null,
  signal: null,
  poorContact: false,
  lastDeviceName: loadLastName(),
  error: null,
};

function loadLastName(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { name?: string }).name ?? null;
  } catch {
    return null;
  }
}
function saveLast(id: string | null, name: string | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!id && !name) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify({ id, name }));
  } catch {
    /* noop */
  }
}

function setState(patch: Partial<BtHrState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l(state);
}

export function getNativeBleState(): BtHrState {
  return state;
}

export function subscribeNativeBle(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

let activeDeviceId: string | null = null;
let lastSampleAt = 0;
let recentBpms: number[] = [];

function parseHeartRate(value: DataView): number | null {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) === 0x01;
  const bpm = is16 ? value.getUint16(1, true) : value.getUint8(1);
  return bpm > 0 && bpm < 300 ? bpm : null;
}

function updateSignal(bpm: number) {
  const now = Date.now();
  const dt = lastSampleAt ? now - lastSampleAt : 0;
  lastSampleAt = now;
  recentBpms.push(bpm);
  if (recentBpms.length > 8) recentBpms.shift();
  const cadence = dt === 0 ? 100 : Math.max(0, 100 - Math.abs(dt - 1000) / 30);
  let jitter = 0;
  if (recentBpms.length >= 3) {
    const diffs: number[] = [];
    for (let i = 1; i < recentBpms.length; i++) diffs.push(Math.abs(recentBpms[i] - recentBpms[i - 1]));
    const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    jitter = Math.min(60, avg * 2);
  }
  const q = Math.max(0, Math.min(100, Math.round(cadence - jitter)));
  setState({ signal: q, poorContact: q < 40 });
}

function vibrate(p: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(p);
  } catch {
    /* noop */
  }
}

export async function connectNativeBleHeartRate(): Promise<BtHrState> {
  const plugin = await loadPlugin();
  if (!plugin) {
    setState({ status: "unsupported", error: "Native BLE unavailable" });
    return state;
  }
  try {
    setState({ status: "scanning", error: null });
    const dev = await plugin.requestDevice({
      services: [HEART_RATE_SERVICE],
      optionalServices: [BATTERY_SERVICE],
    });
    setState({
      status: "connecting",
      deviceId: dev.deviceId,
      deviceName: dev.name ?? "Heart Rate",
    });
    await plugin.connect(dev.deviceId, () => {
      activeDeviceId = null;
      setState({ status: "disconnected", bpm: null, battery: null, signal: null, poorContact: false });
    });
    activeDeviceId = dev.deviceId;
    lastSampleAt = 0;
    recentBpms = [];
    await plugin.startNotifications(dev.deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (v) => {
      const bpm = parseHeartRate(v);
      if (bpm != null) {
        setState({ bpm });
        updateSignal(bpm);
      }
    });
    saveLast(dev.deviceId, dev.name ?? null);
    setState({
      status: "connected",
      lastDeviceName: dev.name ?? state.lastDeviceName,
      poorContact: false,
      signal: null,
    });
    vibrate([20, 60, 20]);
    // Best-effort battery
    try {
      const v = await plugin.read(dev.deviceId, BATTERY_SERVICE, BATTERY_LEVEL);
      const pct = v.getUint8(0);
      if (pct >= 0 && pct <= 100) setState({ battery: pct });
    } catch {
      /* noop */
    }
    return state;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    const cancelled = /cancel/i.test(msg);
    setState({
      status: cancelled ? "idle" : "disconnected",
      error: cancelled ? null : msg,
      bpm: null,
      battery: null,
      signal: null,
      poorContact: false,
    });
    return state;
  }
}

export async function disconnectNativeBleHeartRate(): Promise<void> {
  const plugin = await loadPlugin();
  if (plugin && activeDeviceId) {
    try {
      await plugin.stopNotifications(activeDeviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT);
    } catch {
      /* noop */
    }
    try {
      await plugin.disconnect(activeDeviceId);
    } catch {
      /* noop */
    }
  }
  activeDeviceId = null;
  setState({
    status: "idle",
    bpm: null,
    battery: null,
    signal: null,
    poorContact: false,
    deviceName: null,
    deviceId: null,
  });
}

export function clearLastNativeDevice() {
  saveLast(null, null);
  setState({ lastDeviceName: null });
}
