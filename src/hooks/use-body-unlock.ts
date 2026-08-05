// Global safety net: never let the app stay locked.
//
// Clears any leftover body/html scroll-lock styles and orphaned overlay
// portals on route change, on app resume and on a slow interval.

import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { pruneOrphanPortals, resetBodyLocks } from "@/lib/modal-debug";

export function useBodyUnlock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    resetBodyLocks();
    pruneOrphanPortals();
  }, [pathname]);

  useEffect(() => {
    const onResume = () => {
      resetBodyLocks();
      pruneOrphanPortals();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);
    window.addEventListener("pageshow", onResume);
    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, []);
}
