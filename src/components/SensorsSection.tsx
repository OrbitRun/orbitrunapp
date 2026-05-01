import { useEffect, useRef, useState } from "react";
import {
  Battery,
  BatteryLow,
  Bluetooth,
  BluetoothConnected,
  Check,
  Droplets,
  Heart,
  Signal,
  Smartphone,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import {
  clearLastDevice,
  connectBtHeartRate,
  connectViaAppleHealth,
  disconnectBtHeartRate,
  getBtHrState,
  isHealthFallbackAvailable,
  isHeartRateSensorSupported,
  isWebBluetoothSupported,
  subscribeBtHr,
  tryReconnectLastDevice,
  type BtHrState,
} from "@/lib/heart-rate-bt";

/**
 * Sensors row + guided pairing modal for a Bluetooth heart-rate strap.
 * Includes a 3-step prep guide, animated scanning state, troubleshooting tips
 * after 10s, and a connected card with battery + live BPM "Test" view.
 */
export default function SensorsSection() {
  const [bt, setBt] = useState<BtHrState>(getBtHrState());
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showTrouble, setShowTrouble] = useState(false);
  const [testing, setTesting] = useState(false);
  const troubleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => subscribeBtHr(setBt), []);

  const supported = isHeartRateSensorSupported();
  const webBtSupported = isWebBluetoothSupported();
  const healthFallback = isHealthFallbackAvailable();
  const connected = bt.status === "connected";
  const busy = bt.status === "scanning" || bt.status === "connecting";
  const hasLastDevice = !!bt.lastDeviceName && !connected && !busy;

  // Auto-reconnect silently when the app regains focus, if a device was
  // previously paired and is currently disconnected.
  useEffect(() => {
    if (!supported) return;
    const onFocus = () => {
      const s = getBtHrState();
      if (s.status === "disconnected" || (s.status === "idle" && s.lastDeviceName)) {
        void tryReconnectLastDevice();
      }
    };
    // Try once on mount as well.
    onFocus();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [supported]);

  // Surface troubleshooting tips after 10s of scanning
  useEffect(() => {
    if (busy) {
      troubleTimer.current = setTimeout(() => setShowTrouble(true), 10000);
    } else {
      if (troubleTimer.current) clearTimeout(troubleTimer.current);
      if (!busy && bt.status !== "disconnected") setShowTrouble(false);
    }
    return () => {
      if (troubleTimer.current) clearTimeout(troubleTimer.current);
    };
  }, [busy, bt.status]);

  // When pairing completes, jump to step 3 (success view)
  useEffect(() => {
    if (open && connected) setStep(3);
  }, [open, connected]);

  const openModal = () => {
    if (!supported) return;
    setShowTrouble(false);
    setStep(connected ? 3 : 1);
    setOpen(true);
  };

  const startScan = async () => {
    setShowTrouble(false);
    setStep(3);
    await connectBtHeartRate();
  };

  const onDisconnect = async () => {
    await disconnectBtHeartRate();
    setTesting(false);
    setStep(1);
  };

  const onQuickReconnect = async () => {
    const ok = await tryReconnectLastDevice();
    if (!ok) openModal();
  };

  const onForgetDevice = () => {
    clearLastDevice();
  };

  const rowStatus =
    !supported
      ? "Not supported"
      : connected
        ? `Connected: ${bt.deviceName ?? "Heart Rate"}`
        : busy
          ? "Searching…"
          : bt.status === "disconnected"
            ? "Disconnected"
            : "Tap to pair";

  return (
    <>
      <section className="mt-4 glass rounded-2xl divide-y divide-border">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
            Sensors
          </div>
          {connected && bt.bpm != null && (
            <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-neon">
              <Heart className="h-3 w-3 fill-current" />
              <span className="font-display font-black">{bt.bpm}</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">bpm</span>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openModal}
          disabled={!supported}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition text-left disabled:opacity-60"
        >
          <div className="relative h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon">
            {connected ? <BluetoothConnected className="h-4 w-4" /> : <Bluetooth className="h-4 w-4" />}
            {connected && (
              <span
                aria-hidden
                className={`absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-background ${
                  bt.poorContact ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                }`}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold flex items-center gap-2">
              Heart rate strap
              {connected && bt.battery != null && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                  {bt.battery <= 20 ? (
                    <BatteryLow className="h-3 w-3 text-amber-400" />
                  ) : (
                    <Battery className="h-3 w-3" />
                  )}
                  {bt.battery}%
                </span>
              )}
              {connected && bt.signal != null && (
                <SignalChip quality={bt.signal} />
              )}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {bt.error
                ? bt.error
                : connected && bt.poorContact
                  ? "Dårlig kontakt — fugt sensoren"
                  : rowStatus}
            </div>
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-foreground/80">
            {connected ? "Manage" : supported ? "Search" : "—"}
          </div>
        </button>
        {hasLastDevice && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.02]">
            <Zap className="h-3.5 w-3.5 text-neon" />
            <button
              type="button"
              onClick={onQuickReconnect}
              className="flex-1 text-left text-[12px] font-semibold truncate hover:text-neon transition"
            >
              Genforbind til {bt.lastDeviceName}
            </button>
            <button
              type="button"
              onClick={onForgetDevice}
              className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
              aria-label="Glem enhed"
            >
              Glem
            </button>
          </div>
        )}
      </section>

      {open && (
        <PairingModal
          step={step}
          setStep={setStep}
          bt={bt}
          busy={busy}
          connected={connected}
          showTrouble={showTrouble}
          testing={testing}
          setTesting={setTesting}
          onClose={() => {
            setOpen(false);
            setTesting(false);
          }}
          onStartScan={startScan}
          onDisconnect={onDisconnect}
          onRescan={async () => {
            setShowTrouble(false);
            await connectBtHeartRate();
          }}
        />
      )}
    </>
  );
}

/* ============================== Pairing Modal ============================== */

type ModalProps = {
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
  bt: BtHrState;
  busy: boolean;
  connected: boolean;
  showTrouble: boolean;
  testing: boolean;
  setTesting: (b: boolean) => void;
  onClose: () => void;
  onStartScan: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onRescan: () => void | Promise<void>;
};

function PairingModal({
  step,
  setStep,
  bt,
  busy,
  connected,
  showTrouble,
  testing,
  setTesting,
  onClose,
  onStartScan,
  onDisconnect,
  onRescan,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-background p-5 shadow-card animate-scale-in">
        <header className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
              Pair sensor
            </div>
            <h2 className="font-display font-black text-2xl tracking-tight">Heart rate strap</h2>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-white/5 grid place-items-center hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Stepper dots */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition ${
                  step >= (n as 1 | 2 | 3) ? "bg-neon" : "bg-white/10"
                }`}
              />
            </div>
          ))}
        </div>

        {step === 1 && <StepStrap onNext={() => setStep(2)} />}
        {step === 2 && <StepBluetooth onBack={() => setStep(1)} onNext={onStartScan} />}
        {step === 3 && (
          <StepScan
            bt={bt}
            busy={busy}
            connected={connected}
            showTrouble={showTrouble}
            testing={testing}
            setTesting={setTesting}
            onRescan={onRescan}
            onDisconnect={onDisconnect}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

/* ================================ Steps ================================== */

function StepStrap({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <div className="rounded-2xl bg-white/5 p-5 grid place-items-center mb-4">
        <div className="h-16 w-16 rounded-2xl bg-neon/10 grid place-items-center text-neon">
          <Droplets className="h-8 w-8" />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold mb-1">
        Step 1 · Strap on
      </div>
      <h3 className="font-display font-black text-xl mb-2">Put on your strap</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Tag dit pulsbælte på. Fugt gerne sensorerne med lidt vand for bedre kontakt med huden.
      </p>
      <button
        onClick={onNext}
        className="w-full h-12 rounded-xl bg-neon text-primary-foreground font-black uppercase tracking-wider text-sm active:scale-[0.98] transition"
      >
        Næste
      </button>
    </div>
  );
}

function StepBluetooth({ onBack, onNext }: { onBack: () => void; onNext: () => void | Promise<void> }) {
  return (
    <div>
      <div className="rounded-2xl bg-white/5 p-5 grid place-items-center mb-4">
        <div className="h-16 w-16 rounded-2xl bg-neon/10 grid place-items-center text-neon">
          <Smartphone className="h-8 w-8" />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold mb-1">
        Step 2 · Bluetooth
      </div>
      <h3 className="font-display font-black text-xl mb-2">Slå Bluetooth til</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Sørg for, at Bluetooth er slået til på din telefon, og at bæltet ikke er forbundet til en anden app.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onBack}
          className="h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold uppercase tracking-wider text-sm transition"
        >
          Tilbage
        </button>
        <button
          onClick={onNext}
          className="h-12 rounded-xl bg-neon text-primary-foreground font-black uppercase tracking-wider text-sm active:scale-[0.98] transition"
        >
          Søg
        </button>
      </div>
    </div>
  );
}

function StepScan({
  bt,
  busy,
  connected,
  showTrouble,
  testing,
  setTesting,
  onRescan,
  onDisconnect,
  onClose,
}: {
  bt: BtHrState;
  busy: boolean;
  connected: boolean;
  showTrouble: boolean;
  testing: boolean;
  setTesting: (b: boolean) => void;
  onRescan: () => void | Promise<void>;
  onDisconnect: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <div>
      {/* Visual */}
      <div className="relative rounded-2xl bg-white/5 p-6 grid place-items-center mb-4 h-48 overflow-hidden">
        {/* Radar rings while busy */}
        {busy && (
          <>
            <span
              aria-hidden
              className="absolute h-20 w-20 rounded-full border border-neon/60 animate-hr-radar"
            />
            <span
              aria-hidden
              className="absolute h-20 w-20 rounded-full border border-neon/40 animate-hr-radar"
              style={{ animationDelay: "0.6s" }}
            />
            <span
              aria-hidden
              className="absolute h-20 w-20 rounded-full border border-neon/30 animate-hr-radar"
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}
        {/* Connected: thumping heart */}
        <div
          className={`relative h-16 w-16 rounded-full grid place-items-center ${
            connected ? "bg-neon text-primary-foreground" : "bg-neon/10 text-neon"
          }`}
        >
          <Heart
            className={`h-8 w-8 fill-current ${connected ? "animate-heart-thump" : ""}`}
          />
        </div>
      </div>

      {/* Status block */}
      {connected ? (
        <ConnectedCard bt={bt} testing={testing} setTesting={setTesting} />
      ) : (
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold mb-1">
            {busy ? "Step 3 · Searching" : "Step 3 · Choose device"}
          </div>
          <h3 className="font-display font-black text-xl mb-2">
            {busy ? "Searching for sensors…" : "Vælg din enhed"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {bt.error
              ? bt.error
              : busy
                ? "Bekræft enheden i browserens dialog når den dukker op."
                : "Tryk Søg for at åbne enhedsvælgeren igen."}
          </p>
        </div>
      )}

      {/* Troubleshooting */}
      {showTrouble && !connected && (
        <div className="mt-3 mb-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-[12px] leading-relaxed text-amber-100/90">
          <strong className="block text-amber-300 mb-1 uppercase tracking-wider text-[10px]">
            Ingen enheder fundet?
          </strong>
          Prøv at tage bæltet af og på igen, eller tjek om det er forbundet til en anden app
          (f.eks. Strava eller Garmin) — Bluetooth kan ofte kun forbinde til én app ad gangen.
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {connected ? (
          <>
            <button
              onClick={onDisconnect}
              className="h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold uppercase tracking-wider text-sm text-destructive transition"
            >
              Disconnect
            </button>
            <button
              onClick={onClose}
              className="h-12 rounded-xl bg-neon text-primary-foreground font-black uppercase tracking-wider text-sm active:scale-[0.98] transition"
            >
              Færdig
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onClose}
              className="h-12 rounded-xl bg-white/5 hover:bg-white/10 font-bold uppercase tracking-wider text-sm transition"
            >
              Luk
            </button>
            <button
              onClick={onRescan}
              disabled={busy}
              className="h-12 rounded-xl bg-neon text-primary-foreground font-black uppercase tracking-wider text-sm active:scale-[0.98] transition disabled:opacity-60"
            >
              {busy ? "Søger…" : "Søg igen"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ConnectedCard({
  bt,
  testing,
  setTesting,
}: {
  bt: BtHrState;
  testing: boolean;
  setTesting: (b: boolean) => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4 mb-1">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-emerald-400/15 grid place-items-center">
          <Check className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold">
            Forbundet
          </div>
          <div className="font-display font-black text-lg leading-tight truncate">
            {bt.deviceName ?? "Heart Rate"}
          </div>
        </div>
        {bt.battery != null && (
          <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-foreground/80">
            {bt.battery <= 20 ? (
              <BatteryLow className="h-4 w-4 text-amber-400" />
            ) : (
              <Battery className="h-4 w-4" />
            )}
            {bt.battery}%
          </div>
        )}
      </div>

      {/* Signal quality */}
      {bt.signal != null && (
        <div className="mt-3 flex items-center gap-2">
          <Signal className={`h-3.5 w-3.5 ${signalColor(bt.signal)}`} />
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${signalBarColor(bt.signal)}`}
              style={{ width: `${Math.max(6, bt.signal)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-8 text-right">
            {bt.signal}%
          </span>
        </div>
      )}

      {/* Poor contact warning */}
      {bt.poorContact && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-[11px] leading-snug text-amber-100/90">
          <TriangleAlert className="h-3.5 w-3.5 text-amber-300 mt-0.5 shrink-0" />
          <span>
            <strong className="text-amber-300">Dårlig kontakt.</strong>{" "}
            Fugt sensoren med lidt vand og sørg for, at bæltet sidder tæt mod huden.
          </span>
        </div>
      )}

      {testing ? (
        <div className="mt-4 rounded-xl bg-background/60 border border-border p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
              Live puls
            </div>
            <div className="font-display font-black text-4xl text-neon tabular-nums leading-none mt-1">
              {bt.bpm ?? "—"}
              <span className="text-sm text-muted-foreground ml-1 font-mono">bpm</span>
            </div>
          </div>
          <Heart className="h-10 w-10 text-neon fill-current animate-heart-thump" />
        </div>
      ) : (
        <button
          onClick={() => setTesting(true)}
          className="mt-3 w-full h-10 rounded-xl bg-white/5 hover:bg-white/10 font-bold uppercase tracking-wider text-xs transition"
        >
          Test puls
        </button>
      )}
    </div>
  );
}

/* ============================ Small helpers ============================ */

function signalColor(q: number): string {
  if (q >= 70) return "text-emerald-400";
  if (q >= 40) return "text-amber-400";
  return "text-destructive";
}

function signalBarColor(q: number): string {
  if (q >= 70) return "bg-emerald-400";
  if (q >= 40) return "bg-amber-400";
  return "bg-destructive";
}

function SignalChip({ quality }: { quality: number }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${signalColor(quality)}`}
      title={`Signal ${quality}%`}
    >
      <Signal className="h-3 w-3" />
      {quality}
    </span>
  );
}
