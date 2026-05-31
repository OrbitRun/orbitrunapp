import { useEffect } from "react";
import {
  isNativeGeolocationAvailable,
  nativeGetCurrentPosition,
  requestNativeGeolocationPermission,
} from "@/lib/geolocation-native";

export function useGpsWarmup() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isNativeGeolocationAvailable()) {
          const status = await requestNativeGeolocationPermission();
          if (cancelled) return;
          if (status === "denied" || status === "unavailable") return;
          await nativeGetCurrentPosition();
          return;
        }
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {},
            () => {},
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
          );
        }
      } catch {
        /* noop */
      }
    })();
    return () => { cancelled = true; };
  }, []);
}
