// Web Bluetooth heart-rate sensor client.
//
// Exposes a tiny pub/sub around the standard Heart Rate Service (0x180D) and
// its Heart Rate Measurement characteristic (0x2A37). When a sensor is
// connected, the latest BPM is broadcast via subscribe() and stored in a
// module-level snapshot so the run tracker can prefer it over Apple Health.

export type BtHrStatus = "idle" | "scanning" | "connecting" | "connected" | "disconnected" | "unsupported";

export type BtHrState = {
  status: BtHrStatus;
  deviceName: string | null;
  bpm: number | null;
  battery: number | null;
  error: string | null;
};

type Listener = (s: BtHrState) => void;

let state: BtHrState = {
  status: typeof navigator !== "undefined" && (navigator as Navigator & { bluetooth?: unknown }).bluetooth
    ? "idle"
    : "unsupported",
  deviceName: null,
  bpm: null,
  battery: null,
  error: null,
};
const listeners = new Set<Listener>();

// Active connection refs
type BtDevice = {
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

// Parse the Heart Rate Measurement characteristic per Bluetooth spec.
// Flags byte: bit 0 → 1 = uint16 BPM, 0 = uint8 BPM.
function parseHeartRate(value: DataView): number | null {
  if (!value || value.byteLength < 2) return null;
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) === 0x01;
  const bpm = is16 ? value.getUint16(1, /* littleEndian */ true) : value.getUint8(1);
  return bpm > 0 && bpm < 300 ? bpm : null;
}

const onMeasurement = (ev: Event) => {
  const target = ev.target as unknown as { value?: DataView };
  const v = target?.value;
  if (!v) return;
  const bpm = parseHeartRate(v);
  if (bpm != null) setState({ bpm });
};

const onDisconnected = () => {
  setState({ status: "disconnected", bpm: null, battery: null });
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

export async function connectBtHeartRate(): Promise<BtHrState> {
  if (!isWebBluetoothSupported()) {
    setState({ status: "unsupported", error: "Web Bluetooth not supported in this browser." });
    return state;
  }
  try {
    setState({ status: "scanning", error: null });
    const bt = (navigator as Navigator & {
      bluetooth: {
        requestDevice: (o: unknown) => Promise<BtDevice>;
      };
    }).bluetooth;
    const dev = await bt.requestDevice({
      filters: [{ services: ["heart_rate"] }],
      optionalServices: ["battery_service"],
    });
    device = dev;
    dev.addEventListener("gattserverdisconnected", onDisconnected);

    setState({ status: "connecting", deviceName: dev.name ?? "Heart Rate" });
    const server = await dev.gatt!.connect() as {
      getPrimaryService: (s: string) => Promise<{
        getCharacteristic: (c: string) => Promise<typeof characteristic>;
      }>;
    };
    const service = await server.getPrimaryService("heart_rate");
    const ch = await service.getCharacteristic("heart_rate_measurement");
    characteristic = ch;
    ch!.addEventListener("characteristicvaluechanged", onMeasurement);
    await ch!.startNotifications();
    setState({ status: "connected" });
    return state;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed";
    // User-cancelled chooser also lands here — surface as idle, not error.
    const cancelled = /cancelled|user|chosen/i.test(msg);
    setState({
      status: cancelled ? "idle" : "disconnected",
      error: cancelled ? null : msg,
      bpm: null,
    });
    return state;
  }
}

export async function disconnectBtHeartRate(): Promise<void> {
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
    characteristic = null;
    device = null;
    setState({ status: "idle", bpm: null, deviceName: null });
  }
}

export function isBtHrConnected(): boolean {
  return state.status === "connected";
}

export function getLatestBtBpm(): number | null {
  return state.status === "connected" ? state.bpm : null;
}
