import { useEffect } from "react";

import { logMount, logOverlayState, logUnmount } from "@/lib/freeze-log";

/** Records mount/unmount of a component in the freeze lifecycle log. */
export function useFreezeTrace(name: string) {
  useEffect(() => {
    logMount(name);
    return () => logUnmount(name);
  }, [name]);
}

/** Records open/close of an overlay in the freeze lifecycle log. */
export function useOverlayTrace(name: string, open: boolean) {
  useEffect(() => {
    logOverlayState(name, open);
  }, [name, open]);
}
