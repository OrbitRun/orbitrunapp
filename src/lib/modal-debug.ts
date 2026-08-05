// Temporary iOS/Capacitor debugging + body-lock recovery helpers.
//
// WKWebView can leave `body`/`html` with scroll-lock styles (overflow,
// position, pointer-events) if a modal unmounts while the keyboard is
// animating. That makes the whole app look fine but stop responding to taps.
// `resetBodyLocks()` is the single place that clears them.

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

const DEBUG = true;

/** Temporary instrumentation: logs body/html lock state around modal toggles. */
export function logModalState(name: string, open: boolean) {
  if (!DEBUG || typeof document === "undefined") return;
  const b = document.body?.style;
  const h = document.documentElement?.style;
  // eslint-disable-next-line no-console
  console.log(
    `[modal] ${name} ${open ? "open" : "close"}`,
    JSON.stringify({
      bodyOverflow: b?.overflow || "",
      bodyPosition: b?.position || "",
      bodyPointerEvents: b?.pointerEvents || "",
      htmlOverflow: h?.overflow || "",
      scrollLocked: document.body?.hasAttribute("data-scroll-locked") ?? false,
      active: (document.activeElement as HTMLElement | null)?.tagName ?? "none",
      portals: document.querySelectorAll("[data-radix-portal]").length,
    }),
  );
}
