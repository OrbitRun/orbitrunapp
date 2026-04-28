import { useEffect, useState } from "react";
import { Activity, X } from "lucide-react";
import {
  isHealthAvailable,
  requestHeartRatePermission,
  type HealthPermissionStatus,
} from "@/lib/health";

const ASKED_KEY = "orbit:health:asked";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResult?: (status: HealthPermissionStatus) => void;
};

/**
 * Bottom sheet that asks the user for read access to Apple Health heart rate.
 * Renders nothing on the web (HealthKit unavailable) — only appears inside a
 * Capacitor iOS shell.
 */
export default function HealthPermissionSheet({ open, onOpenChange, onResult }: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!isHealthAvailable()) {
      onOpenChange(false);
    }
  }, [open, onOpenChange]);

  if (!open || !isHealthAvailable()) return null;

  const handleAllow = async () => {
    setBusy(true);
    const result = await requestHeartRatePermission();
    try {
      window.localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* noop */
    }
    setBusy(false);
    onResult?.(result);
    onOpenChange(false);
  };

  const handleSkip = () => {
    try {
      window.localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* noop */
    }
    onResult?.("denied");
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-strong rounded-t-3xl border-t border-x border-border p-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-neon/10 grid place-items-center text-neon">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-black text-lg leading-tight">
              Connect Apple Health
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-snug">
              Orbit reads your heart rate during runs to show live BPM and save
              it alongside your route. Nothing else is read or written.
            </p>
          </div>
          <button
            onClick={handleSkip}
            aria-label="Close"
            className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:bg-white/5 active:scale-95 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleSkip}
            disabled={busy}
            className="h-12 rounded-2xl border border-white/10 bg-white/5 text-sm font-bold uppercase tracking-[0.16em] active:scale-95 transition disabled:opacity-50"
          >
            Not now
          </button>
          <button
            onClick={handleAllow}
            disabled={busy}
            className="h-12 rounded-2xl bg-neon text-primary-foreground text-sm font-black uppercase tracking-[0.16em] shadow-neon active:scale-95 transition disabled:opacity-50"
          >
            {busy ? "…" : "Allow"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function shouldAskHealthPermission(): boolean {
  if (!isHealthAvailable()) return false;
  try {
    return window.localStorage.getItem(ASKED_KEY) !== "1";
  } catch {
    return false;
  }
}
