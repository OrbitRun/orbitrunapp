// Temporary on-device diagnostics for the iOS/Capacitor freeze.
//
// Shows the full freeze report: focus, pointer-events on body/html/#root,
// remaining Radix portals, open overlays, the element under the last touch,
// and the component lifecycle (last mounted / unmounted). Auto-detected
// freezes are captured by the watchdog and shown here as well.

import { useEffect, useState } from "react";
import { Bug } from "lucide-react";

import {
  collectFreezeReport,
  formatFreezeReport,
  getLastFreezeReport,
  installFreezeWatchdog,
  subscribeLifecycle,
  type FreezeReport,
} from "@/lib/freeze-log";

export default function FreezeDiagnostics() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<FreezeReport | null>(null);
  const [autoCount, setAutoCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isNative = !!(
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.();
    const forced = new URLSearchParams(window.location.search).get("diag") === "1";
    setVisible(isNative || forced);

    const uninstall = installFreezeWatchdog();
    let lastSeen: FreezeReport | null = getLastFreezeReport();
    const unsub = subscribeLifecycle(() => {
      const last = getLastFreezeReport();
      if (last && last !== lastSeen) {
        lastSeen = last;
        setAutoCount((c) => c + 1);
      }
    });
    return () => {
      uninstall();
      unsub();
    };
  }, []);

  const capture = (report?: FreezeReport) => {
    setSnap(report ?? collectFreezeReport("manual"));
    setOpen(true);
  };

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => capture()}
        aria-label="Diagnostics"
        className="fixed z-[100] right-2 h-9 w-9 rounded-full bg-black/70 border border-white/20 grid place-items-center text-neon"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <Bug className="h-4 w-4" />
        {autoCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground">
            {autoCount}
          </span>
        )}
      </button>
      {open && snap && (
        <div
          className="fixed inset-x-2 z-[101] max-h-[70dvh] overflow-y-auto rounded-2xl border border-white/15 bg-black/90 p-3"
          style={{ top: "calc(env(safe-area-inset-top) + 52px)" }}
        >
          <pre className="text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
            {formatFreezeReport(snap)}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const last = getLastFreezeReport();
                if (last) capture(last);
              }}
              className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold"
            >
              Sidste freeze
            </button>
            <button
              type="button"
              onClick={() => capture()}
              className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold"
            >
              Opdater
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg bg-neon py-2 text-xs font-bold text-primary-foreground"
            >
              Luk
            </button>
          </div>
        </div>
      )}
    </>
  );
}
