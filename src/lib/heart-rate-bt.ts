// Web Bluetooth heart-rate sensor client.
//
// Exposes a tiny pub/sub around the standard Heart Rate Service (0x180D) and
// its Heart Rate Measurement characteristic (0x2A37). When a sensor is
// connected, the latest BPM is broadcast via subscribe() and stored in a
// module-level snapshot so the run tracker can prefer it over Apple Health.
//
// Polish (April 2026):
//  • Persists last paired device id/name in localStorage and exposes a silent
//    reconnect path via navigator.bluetooth.getDevices() where supported.
//  • Tracks a rolling signal-quality score derived from the time between
//    measurements + plausibility checks (Web Bluetooth doesn't expose RSSI,
//    so we infer "contact quality" instead — which is what the user actually
//    cares about).
//  • Surfaces a contact warning when BPM is missing/zero or jitters wildly.
//  • Fires short haptic pulses on first valid reading and on connect.

export type BtHrStatus = "idle" | "scanning" | "connecting" | "connected" | "disconnected" | "unsupported";

export type BtHrState = {
  status: BtHrStatus;
  deviceName: string | null;
  deviceId: string | null;
  bpm: number | null;
  battery: number | null;
  /** 0–100 inferred contact/signal quality. null until first sample. */
  signal: number | null;
  /** True when readings indicate poor skin contact (jitter, drops). */
  poorContact: boolean;
  /** Last paired device, available even when disconnected, for one-tap reconnect. */
  lastDeviceName: string | null;
  error: string | null;
};

type Listener = (s: BtHrState) => void;

const LS_KEY = "orbit:bt-hr:last-device";

function loadLastDevice(): { id: string | null; name: string | null } {
  if (typeof localStorage === "undefined") return { id: null, name: null };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { id: null, name: null };
    const parsed = JSON.parse(raw) as { id?: string; name?: string };
    return { id: parsed.id ?? null, name: parsed.name ?? null };
  } catch {
    return { id: null, name: null };
  }
}

function saveLastDevice(id: string | null, name: string | null) {
  if (typeof localStorage === "undefined") return;
  try {
    if (!id && !name) localStorage.removeItem(LS_KEY);
    else localStorage.setItem(LS_KEY, JSON.stringify({ id, name }));
  } catch {
    /* noop */
  }
}

const initialLast = loadLastDevice();

// NOTE: initial status is "idle" regardless of Web Bluetooth availability —
// the façade decides whether the device is actually unsupported by also
// considering the native BLE bridge and Apple Health fallback.
let state: BtHrState = {
  status: "idle",
  deviceName: null,
  deviceId: null,
  bpm: null,
  battery: null,
  signal: null,
  poorContact: false,
  lastDeviceName: initialLast.name,
  error: null,
};

const listeners = new Set<Listener>();

// Active connection refs
type BtDevice = {
  id?: string;
  name?: string | null;
  gatt?: { connected: boolean; disconnect: () => void; connect: () => Promise<unknown> };
  addEventListener: (t: string, fn: () => void) => void;
  removeEventListener: (t: string, fn: () => void) => void;
};
let device: BtDevice | null = null;
let characteristic: {
  startNotifications: () => Promise<unknown>;
  stopNotifications: () => Promise<unknown>;
  addEventListener: (t: string, fn: (ev: Event) => void) => void;
  removeEventListener: (t: string, fn: (ev: Event) => void) => void;
} | null = null;

// Quality tracking
let lastSampleAt = 0;
let recentBpms: number[] = [];
let firstReadingFired = false;
let contactTimer: ReturnType<typeof setTimeout> | null = null;

function setState(patch: Partial<BtHrState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l(state);
}

export function getBtHrState(): BtHrState {
  return state;
}

export function subscribeBtHr(fn: Listener): () => void {
  listeners.add(fn);
  fn(state);
  return () => listeners.delete(fn);
}

export function isWebBluetoothSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  return Boolean((navigator as Navigator & { bluetooth?: unknown }).bluetooth);
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    /* noop */
  }
}

// Parse the Heart Rate Measurement characteristic per Bluetooth spec.
function parseHeartRate(value: DataView): number | null {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) === 0x01;
  const bpm = is16 ? value.getUint16(1, /* littleEndian */ true) : value.getUint8(1);
  return bpm > 0 && bpm < 300 ? bpm : null;
}

function scheduleContactWatch() {
  if (contactTimer) clearTimeout(contactTimer);
  contactTimer = setTimeout(() => {
    if (state.status !== "connected") return;
    const stale = Date.now() - lastSampleAt > 5000;
    const noBpm = state.bpm == null || state.bpm <= 0;
    if (stale || noBpm) {
      setState({ poorContact: true, signal: 10 });
    }
    scheduleContactWatch();
  }, 2500);
}

function updateSignalQuality(bpm: number) {
  const now = Date.now();
  const dt = lastSampleAt ? now - lastSampleAt : 0;
  lastSampleAt = now;

  recentBpms.push(bpm);
  if (recentBpms.length > 8) recentBpms.shift();

  // Cadence score: ideal sample arrives every ~1000ms (1 Hz). Worse → lower.
  const cadence = dt === 0 ? 100 : Math.max(0, 100 - Math.abs(dt - 1000) / 30);

  // Jitter score: large beat-to-beat swings hint at poor contact.
  let jitterPenalty = 0;
  if (recentBpms.length >= 3) {
    const diffs: number[] = [];
    for (let i = 1; i < recentBpms.length; i++) diffs.push(Math.abs(recentBpms[i] - recentBpms[i - 1]));
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    jitterPenalty = Math.min(60, avgDiff * 2);
  }

  const quality = Math.max(0, Math.min(100, Math.round(cadence - jitterPenalty)));
  const poor = quality < 40;
  setState({ signal: quality, poorContact: poor });
}

const onMeasurement = (ev: Event) => {
  const target = ev.target as unknown as { value?: DataView };
  const v = target?.value;
  if (!v) return;
  const bpm = parseHeartRate(v);
  if (bpm != null) {
    if (!firstReadingFired) {
      firstReadingFired = true;
      vibrate(40);
    }
    setState({ bpm });
    updateSignalQuality(bpm);
  }
};

const onDisconnected = () => {
  if (contactTimer) {
    clearTimeout(contactTimer);
    contactTimer = null;
  }
  setState({ status: "disconnected", bpm: null, battery: null, signal: null, poorContact: false });
  characteristic = null;
};

async function readBatteryLevel(server: {
  getPrimaryService: (s: string) => Promise<{
    getCharacteristic: (c: string) => Promise<{ readValue: () => Promise<DataView> }>;
  }>;
}): Promise<number | null> {
  try {
    const svc = await server.getPrimaryService("battery_service");
    const ch = await svc.getCharacteristic("battery_level");
    const v = await ch.readValue();
    const pct = v.getUint8(0);
    return pct >= 0 && pct <= 100 ? pct : null;
  } catch {
    return null;
  }
}

type GattServer = {
  getPrimaryService: (s: string) => Promise<{
    getCharacteristic: (c: string) => Promise<typeof characteristic>;
  }>;
};

async function attachToDevice(dev: BtDevice): Promise<BtHrState> {
  device = dev;
  dev.addEventListener("gattserverdisconnected", onDisconnected);
  setState({
    status: "connecting",
    deviceName: dev.name ?? "Heart Rate",
    deviceId: dev.id ?? null,
    error: null,
  });

  const server = (await dev.gatt!.connect()) as GattServer;
  const service = await server.getPrimaryService("heart_rate");
  const ch = await service.getCharacteristic("heart_rate_measurement");
  characteristic = ch;
  ch!.addEventListener("characteristicvaluechanged", onMeasurement);
  await ch!.startNotifications();

  firstReadingFired = false;
  lastSampleAt = 0;
  recentBpms = [];
  saveLastDevice(dev.id ?? null, dev.name ?? null);
  setState({
    status: "connected",
    poorContact: false,
    signal: null,
    lastDeviceName: dev.name ?? state.lastDeviceName,
  });
  vibrate([20, 60, 20]);
  scheduleContactWatch();

  // Best-effort battery read
  const battery = await readBatteryLevel(
    server as unknown as Parameters<typeof readBatteryLevel>[0],
  );
  if (battery != null) setState({ battery });
  return state;
}

async function _webConnect(): Promise<BtHrState> {
  if (!isWebBluetoothSupported()) {
    setState({ status: "unsupported", error: "Web Bluetooth not supported in this browser." });
    return state;
  }
  try {
    setState({ status: "scanning", error: null });
    const bt = (navigator as Navigator & {
      bluetooth: { requestDevice: (o: unknown) => Promise<BtDevice> };
    }).bluetooth;
    const dev = await bt.requestDevice({
      filters: [{ services: ["heart_rate"] }],
      optionalServices: ["battery_service"],
    });
    return await attachToDevice(dev);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    const cancelled = /cancelled|user|chosen/i.test(msg);
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

/**
 * Try to silently reconnect to a previously-paired device using
 * navigator.bluetooth.getDevices() (Chromium-only). Returns true if
 * reconnection succeeded. No chooser UI is shown.
 */
async function _webTryReconnect(): Promise<boolean> {
  if (!isWebBluetoothSupported()) return false;
  if (state.status === "connected" || state.status === "connecting") return true;
  const last = loadLastDevice();
  if (!last.id && !last.name) return false;
  try {
    const bt = (navigator as Navigator & {
      bluetooth: { getDevices?: () => Promise<BtDevice[]> };
    }).bluetooth;
    if (typeof bt.getDevices !== "function") return false;
    const devs = await bt.getDevices();
    const match = devs.find((d) => (last.id && d.id === last.id) || (last.name && d.name === last.name));
    if (!match) return false;
    setState({ status: "connecting", deviceName: match.name ?? last.name, error: null });
    await attachToDevice(match);
    return true;
  } catch {
    setState({ status: "idle" });
    return false;
  }
}

function _webClearLast() {
  saveLastDevice(null, null);
  setState({ lastDeviceName: null });
}

async function _webDisconnect(): Promise<void> {
  try {
    if (characteristic) {
      try {
        characteristic.removeEventListener("characteristicvaluechanged", onMeasurement);
        await characteristic.stopNotifications();
      } catch {
        /* noop */
      }
    }
    if (device) {
      try {
        device.removeEventListener("gattserverdisconnected", onDisconnected);
      } catch {
        /* noop */
      }
      try {
        device.gatt?.disconnect();
      } catch {
        /* noop */
      }
    }
  } finally {
    if (contactTimer) {
      clearTimeout(contactTimer);
      contactTimer = null;
    }
    characteristic = null;
    device = null;
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
}

export function isBtHrConnected(): boolean {
  return state.status === "connected";
}

export function getLatestBtBpm(): number | null {
  return state.status === "connected" ? state.bpm : null;
}

/* ========================================================================== *
 *                     TRANSPORT FAÇADE (BLE / Web BT / Health)               *
 * ========================================================================== *
 * Picks the best HR source at runtime:
 *   1. Native BLE (Capacitor iOS/Android shell)
 *   2. Web Bluetooth (Chromium browsers)
 *   3. Apple Health polling (iOS fallback when BLE pairing fails)
 * The public API below mirrors the legacy Web Bluetooth exports so that
 * existing consumers (SensorsSection, use-run-tracker) keep working.
 */

import {
  isNativeBleAvailable,
  connectNativeBleHeartRate,
  disconnectNativeBleHeartRate,
  subscribeNativeBle,
  clearLastNativeDevice,
  getNativeBleState,
} from "@/lib/heart-rate-ble-native";
import {
  isHealthAvailable,
  startHealthHeartRateStream,
  stopHeartRatePolling,
} from "@/lib/health";

export type HrTransport = "native" | "web" | "health" | "none";

let activeTransport: HrTransport = "none";
let nativeUnsub: (() => void) | null = null;
let healthBpmTimer: ReturnType<typeof setInterval> | null = null;

function pickPrimaryTransport(): HrTransport {
  if (isNativeBleAvailable()) return "native";
  if (isWebBluetoothSupported()) return "web";
  if (isHealthAvailable()) return "health";
  return "none";
}

export function isHeartRateSensorSupported(): boolean {
  return pickPrimaryTransport() !== "none";
}

export function isHealthFallbackAvailable(): boolean {
  return isHealthAvailable();
}

export function getActiveHrTransport(): HrTransport {
  return activeTransport;
}

function bridgeNativeState() {
  if (nativeUnsub) return;
  nativeUnsub = subscribeNativeBle((s) => {
    if (activeTransport !== "native") return;
    setState({ ...s });
  });
}

function teardownTransport() {
  if (nativeUnsub) {
    nativeUnsub();
    nativeUnsub = null;
  }
  if (healthBpmTimer) {
    clearInterval(healthBpmTimer);
    healthBpmTimer = null;
  }
  stopHeartRatePolling();
}

/** Public façade: connect via the best available transport. */
export async function connectBtHeartRate(): Promise<BtHrState> {
  const t = pickPrimaryTransport();
  teardownTransport();
  if (t === "native") {
    activeTransport = "native";
    bridgeNativeState();
    const s = await connectNativeBleHeartRate();
    setState({ ...s });
    return state;
  }
  if (t === "web") {
    activeTransport = "web";
    return await _webConnect();
  }
  if (t === "health") {
    return await connectViaAppleHealth();
  }
  setState({ status: "unsupported", error: "No heart-rate transport available." });
  return state;
}

/**
 * Force a direct BLE pairing flow on iOS/Android (skips Apple Health
 * fallback). Used by the "Forbind pulsmåler" CTA so users always get the
 * native chooser even when Apple Health would otherwise be picked.
 */
export async function connectBleDirect(): Promise<BtHrState> {
  teardownTransport();
  if (isNativeBleAvailable()) {
    activeTransport = "native";
    bridgeNativeState();
    const s = await connectNativeBleHeartRate();
    setState({ ...s });
    return state;
  }
  if (isWebBluetoothSupported()) {
    activeTransport = "web";
    return await _webConnect();
  }
  setState({ status: "unsupported", error: "Bluetooth not available on this device." });
  return state;
}

/** Explicit Apple Health fallback (for "Use Apple Health" button). */
export async function connectViaAppleHealth(): Promise<BtHrState> {
  if (!isHealthAvailable()) {
    setState({ status: "unsupported", error: "Apple Health unavailable" });
    return state;
  }
  teardownTransport();
  activeTransport = "health";
  setState({
    status: "connecting",
    deviceName: "Apple Health",
    deviceId: null,
    bpm: null,
    battery: null,
    signal: null,
    poorContact: false,
    error: null,
  });
  const status = await startHealthHeartRateStream((bpm) => {
    if (activeTransport !== "health") return;
    setState({ bpm, signal: 80 });
  }, 5000);
  if (status !== "granted") {
    activeTransport = "none";
    setState({
      status: "disconnected",
      error: status === "denied" ? "Permission denied" : "Apple Health unavailable",
    });
    return state;
  }
  setState({ status: "connected", lastDeviceName: "Apple Health" });
  return state;
}

export async function disconnectBtHeartRate(): Promise<void> {
  const t = activeTransport;
  teardownTransport();
  activeTransport = "none";
  if (t === "native") {
    await disconnectNativeBleHeartRate();
    const s = getNativeBleState();
    setState({ ...s, status: "idle" });
    return;
  }
  if (t === "web") {
    await _webDisconnect();
    return;
  }
  // health or none
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

export async function tryReconnectLastDevice(): Promise<boolean> {
  const t = pickPrimaryTransport();
  if (t === "web") return await _webTryReconnect();
  // Native BLE silent reconnect would require scanning + permission — skip
  // and let the user tap to reconnect explicitly.
  return false;
}

export function clearLastDevice(): void {
  _webClearLast();
  clearLastNativeDevice();
  setState({ lastDeviceName: null });
}

