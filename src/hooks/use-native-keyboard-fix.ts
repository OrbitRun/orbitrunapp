// Keeps the native iOS keyboard from leaving the WKWebView in a broken state.
//
// When the iOS keyboard closes, WKWebView can keep a stale scroll offset and a
// focused element, which makes the page look fine but stop responding to taps.
// On keyboard hide we blur the active element and reset the scroll position.
// Web/Android: no-op.

import { useEffect } from "react";

export function useNativeKeyboardFix() {
  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.getPlatform() !== "ios") return;
        if (!Capacitor.isPluginAvailable("Keyboard")) return;

        const { Keyboard } = await import("@capacitor/keyboard");

        const onHide = () => {
          const el = document.activeElement as HTMLElement | null;
          if (el && typeof el.blur === "function") el.blur();
          window.scrollTo(0, 0);
          if (document.body) document.body.style.transform = "";
        };

        const handle = await Keyboard.addListener("keyboardDidHide", onHide);
        if (disposed) {
          void handle.remove();
          return;
        }
        cleanups.push(() => void handle.remove());
      } catch {
        // Plugin not installed / not native — nothing to do.
      }
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);
}
