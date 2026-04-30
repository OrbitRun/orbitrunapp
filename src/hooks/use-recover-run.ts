import { useCallback, useEffect, useState } from "react";
import {
  clearSnapshot,
  hasRecoverableSnapshot,
  snapshotToRun,
  type FlightSnapshot,
} from "@/lib/flight-recorder";
import { saveRun } from "@/lib/run-types";
import { checkAndUpdatePrs } from "@/lib/personal-records";

export function useRecoverRun() {
  const [snapshot, setSnapshot] = useState<FlightSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(hasRecoverableSnapshot());
  }, []);

  const save = useCallback(() => {
    if (!snapshot) return;
    const run = snapshotToRun(snapshot);
    saveRun(run);
    try {
      const newPrs = checkAndUpdatePrs(run);
      if (newPrs.length > 0) {
        window.dispatchEvent(
          new CustomEvent("orbit:new-pr", { detail: { runId: run.id, categories: newPrs } }),
        );
      }
    } catch {
      /* noop */
    }
    try {
      window.dispatchEvent(new CustomEvent("orbit:run-updated", { detail: { runId: run.id } }));
    } catch {
      /* noop */
    }
    clearSnapshot();
    setSnapshot(null);
  }, [snapshot]);

  const discard = useCallback(() => {
    clearSnapshot();
    setSnapshot(null);
  }, []);

  return { snapshot, save, discard };
}
