// Body-lock recovery helpers + thin bridge to the freeze log.
//
// WKWebView can leave `body`/`html` with scroll-lock styles (overflow,
// position, pointer-events) if a modal unmounts while the keyboard is
// animating. `resetBodyLocks()` is the single place that clears them.
// All forensics now live in `@/lib/freeze-log`.

import { logOverlayState } from "@/lib/freeze-log";

export function resetBodyLocks() {
  if (typeof document === "undefined") return;
  const body = document.body;
  const html = document.documentElement;
  if (body) {
    body.style.overflow = "";
    body.style.position = "";
    body.style.pointerEvents = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
    body.style.transform = "";
    body.removeAttribute("data-scroll-locked");
  }
  if (html) {
    html.style.overflow = "";
    html.style.position = "";
    html.style.paddingRight = "";
  }
}

/** Removes portal containers left behind with no visible content inside. */
export function pruneOrphanPortals() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-radix-portal]").forEach((node) => {
    if (!node.querySelector("[data-state='open']")) node.remove();
  });
}

/** Records an overlay open/close in the freeze lifecycle log. */
export function logModalState(name: string, open: boolean) {
  logOverlayState(name, open);
}
