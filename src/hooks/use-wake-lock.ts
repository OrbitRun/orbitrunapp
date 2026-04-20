import { useCallback, useEffect, useRef } from "react";

type SentinelLike = { released: boolean; release: () => Promise<void> } | null;

export function useWakeLock() {
  const sentinelRef = useRef<SentinelLike>(null);
  const activeRef = useRef(false);

  const request = useCallback(async () => {
    if (typeof navigator === "undefined") return;
    const wl = (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<SentinelLike> } }).wakeLock;
    if (!wl) return;
    try {
      activeRef.current = true;
      sentinelRef.current = await wl.request("screen");
    } catch {
      /* user denied or unavailable */
    }
  }, []);

  const release = useCallback(async () => {
    activeRef.current = false;
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        await sentinelRef.current.release();
      }
    } catch {
      /* noop */
    }
    sentinelRef.current = null;
  }, []);

  // Re-acquire when tab becomes visible again
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible" && activeRef.current && !sentinelRef.current) {
        void request();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void release();
    };
  }, [request, release]);

  return { request, release };
}
