import { useEffect, useState } from "react";
import { Bluetooth, BluetoothConnected, BluetoothSearching, X } from "lucide-react";
import {
  connectBtHeartRate,
  disconnectBtHeartRate,
  getBtHrState,
  isWebBluetoothSupported,
  subscribeBtHr,
  type BtHrState,
} from "@/lib/heart-rate-bt";

/**
 * Sensors row — pairs a Bluetooth heart-rate strap (Web Bluetooth API).
 * Designed to live inside a `glass rounded-2xl` section on the profile screen.
 */
export default function SensorsSection() {
  const [bt, setBt] = useState<BtHrState>(getBtHrState());

  useEffect(() => subscribeBtHr(setBt), []);

  const supported = isWebBluetoothSupported();
  const connected = bt.status === "connected";
  const busy = bt.status === "scanning" || bt.status === "connecting";

  const onClick = async () => {
    if (connected) {
      await disconnectBtHeartRate();
      return;
    }
    if (!supported) return;
    await connectBtHeartRate();
  };

  const Icon =
    bt.status === "connected"
      ? BluetoothConnected
      : busy
        ? BluetoothSearching
        : Bluetooth;

  const statusLabel =
    !supported
      ? "Not supported"
      : bt.status === "scanning"
        ? "Searching…"
        : bt.status === "connecting"
          ? "Pairing…"
          : bt.status === "connected"
            ? bt.deviceName ?? "Connected"
            : bt.status === "disconnected"
              ? "Disconnected"
              : "Tap to pair";

  return (
    <section className="mt-4 glass rounded-2xl divide-y divide-border">
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          Sensors
        </div>
        {connected && bt.bpm != null && (
          <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-neon">
            <span className="font-display font-black">{bt.bpm}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">bpm</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={!supported || busy}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left disabled:opacity-60"
      >
        <div className="relative h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
          <Icon className="h-4 w-4" />
          {busy && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-xl border border-neon/40 animate-bt-pulse"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Heart rate strap</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {bt.error ? bt.error : statusLabel}
          </div>
        </div>
        <div className="text-xs font-bold uppercase tracking-wider text-foreground/80">
          {connected ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <X className="h-3 w-3" />
              Disconnect
            </span>
          ) : busy ? (
            "…"
          ) : supported ? (
            "Search"
          ) : (
            "—"
          )}
        </div>
      </button>
    </section>
  );
}
