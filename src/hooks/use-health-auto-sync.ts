// Auto-syncs Apple Health vitals (resting HR, HRV) into the local Vitals
// store on app launch and after each finished run. Web/Android: no-op.

import { useEffect } from "react";
import { isHealthAvailable, syncVitalsFromHealth } from "@/lib/health";
import { saveVitals } from "@/lib/vitals";

export function useHealthAutoSync() {
  useEffect(() => {
    if (!isHealthAvailable()) return;
    let cancelled = false;

    const run = async () => {
      try {
        const r = await syncVitalsFromHealth();
        if (cancelled) return;
        if (r.status === "granted" && (r.restingHr != null || r.hrvMs != null)) {
          saveVitals({
            restingHr: r.restingHr ?? undefined,
            hrvMs: r.hrvMs ?? undefined,
          });
        }
      } catch {
        /* noop */
      }
    };

    void run();
    const onRunStop = () => void run();
    window.addEventListener("orbit:run-stop", onRunStop);
    return () => {
      cancelled = true;
      window.removeEventListener("orbit:run-stop", onRunStop);
    };
  }, []);
}
