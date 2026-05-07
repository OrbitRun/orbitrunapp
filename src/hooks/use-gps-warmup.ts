import { useEffect } from "react";
import {
  isNativeGeolocationAvailable,
  nativeGetCurrentPosition,
  requestNativeGeolocationPermission,
} from "@/lib/geolocation-native";

/**
 * Wake the GPS chip as soon as the app opens so the very first run starts
 * with a high-accuracy fix already in hand. On native iOS this maps to
 * `kCLLocationAccuracyBestForNavigation`. On the web we just trigger a
 * single `getCurrentPosition` with `enableHighAccuracy: true`.
 */
export function useGpsWarmup() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isNativeGeolocationAvailable()) {
          const status = await requestNativeGeolocationPermission();
          if (cancelled || status !== "granted") return;
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
        /* noop — warm-up only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
