// Freeze forensics for the iOS/Capacitor UI lock.
//
// Every modal/overlay component reports mount + unmount here, and a watchdog
// detects "tap did nothing" situations. When a freeze is detected we ALWAYS
// log the full state: focus, pointer-events on body/html/#root, remaining
// Radix portals, every open overlay, and the last mounted/unmounted component.

export type LifecycleEvent = {
  t: number;
  name: string;
  phase: "mount" | "unmount" | "open" | "close";
};

const LIFECYCLE_LIMIT = 40;
const lifecycle: LifecycleEvent[] = [];

const listeners = new Set<() => void>();

function push(name: string, phase: LifecycleEvent["phase"]) {
  lifecycle.push({ t: Date.now(), name, phase });
  if (lifecycle.length > LIFECYCLE_LIMIT) lifecycle.shift();
  listeners.forEach((l) => l());
}

export function logMount(name: string) {
  push(name, "mount");
}
export function logUnmount(name: string) {
  push(name, "unmount");
}
export function logOverlayState(name: string, open: boolean) {
  push(name, open ? "open" : "close");
}
export function getLifecycle(): LifecycleEvent[] {
  return [...lifecycle];
}
export function subscribeLifecycle(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function describeElement(el: Element | null): string {
  if (!el) return "none";
  const html = el as HTMLElement;
  const id = html.id ? `#${html.id}` : "";
  const cls =
    typeof html.className === "string" && html.className.trim()
      ? `.${html.className.trim().split(/\s+/).slice(0, 4).join(".")}`
      : "";
  let pe = "?";
  let z = "?";
  try {
    const cs = getComputedStyle(html);
    pe = cs.pointerEvents;
    z = cs.zIndex;
  } catch {
    /* ignore */
  }
  return `${el.tagName.toLowerCase()}${id}${cls} [pe:${pe} z:${z}]`;
}

export type FreezeReport = {
  reason: string;
  activeElement: string;
  pointerEvents: { body: string; html: string; root: string };
  bodyStyle: string;
  htmlStyle: string;
  scrollLocked: boolean;
  radixPortals: string[];
  openOverlays: string[];
  lastMounted: string;
  lastUnmounted: string;
  lastTouch: string;
  elementAtTouch: string;
  lifecycle: string[];
};

let lastPoint: { x: number; y: number } | null = null;

function computedPE(el: Element | null): string {
  if (!el) return "n/a";
  try {
    return getComputedStyle(el).pointerEvents;
  } catch {
    return "?";
  }
}

export function collectFreezeReport(reason = "manual"): FreezeReport {
  const body = document.body;
  const html = document.documentElement;
  const root = document.getElementById("root");

  const portalNodes = Array.from(document.querySelectorAll("[data-radix-portal]"));
  const overlayNodes = Array.from(
    document.querySelectorAll("[data-state='open'], [data-radix-popper-content-wrapper]"),
  );

  const lastMount = [...lifecycle].reverse().find((e) => e.phase === "mount" || e.phase === "open");
  const lastUnmount = [...lifecycle]
    .reverse()
    .find((e) => e.phase === "unmount" || e.phase === "close");

  return {
    reason,
    activeElement: describeElement(document.activeElement),
    pointerEvents: {
      body: computedPE(body),
      html: computedPE(html),
      root: computedPE(root),
    },
    bodyStyle: body?.style.cssText || "(tom)",
    htmlStyle: html?.style.cssText || "(tom)",
    scrollLocked: body?.hasAttribute("data-scroll-locked") ?? false,
    radixPortals: portalNodes.map(describeElement),
    openOverlays: overlayNodes.slice(0, 10).map(describeElement),
    lastMounted: lastMount ? `${lastMount.name} (${lastMount.phase})` : "ingen",
    lastUnmounted: lastUnmount ? `${lastUnmount.name} (${lastUnmount.phase})` : "ingen",
    lastTouch: lastPoint ? `${Math.round(lastPoint.x)}, ${Math.round(lastPoint.y)}` : "ingen",
    elementAtTouch: lastPoint
      ? describeElement(document.elementFromPoint(lastPoint.x, lastPoint.y))
      : "n/a",
    lifecycle: lifecycle
      .slice(-12)
      .map((e) => `${new Date(e.t).toISOString().slice(11, 23)} ${e.name} ${e.phase}`),
  };
}

export function formatFreezeReport(r: FreezeReport): string {
  return [
    `reason: ${r.reason}`,
    `activeElement: ${r.activeElement}`,
    `pointer-events: body=${r.pointerEvents.body} html=${r.pointerEvents.html} #root=${r.pointerEvents.root}`,
    `body.style: ${r.bodyStyle}`,
    `html.style: ${r.htmlStyle}`,
    `data-scroll-locked: ${r.scrollLocked}`,
    `radix portals (${r.radixPortals.length}):`,
    ...(r.radixPortals.length ? r.radixPortals.map((p) => `  - ${p}`) : ["  (ingen)"]),
    `open overlays (${r.openOverlays.length}):`,
    ...(r.openOverlays.length ? r.openOverlays.map((p) => `  - ${p}`) : ["  (ingen)"]),
    `sidst mounted/åbnet: ${r.lastMounted}`,
    `sidst unmounted/lukket: ${r.lastUnmounted}`,
    `sidste touch: ${r.lastTouch}`,
    `elementFromPoint: ${r.elementAtTouch}`,
    "lifecycle:",
    ...(r.lifecycle.length ? r.lifecycle.map((l) => `  ${l}`) : ["  (tom)"]),
  ].join("\n");
}

let lastReport: FreezeReport | null = null;
export function getLastFreezeReport() {
  return lastReport;
}

export function reportFreeze(reason: string) {
  lastReport = collectFreezeReport(reason);
  // eslint-disable-next-line no-console
  console.warn(`[freeze] ${reason}\n${formatFreezeReport(lastReport)}`);
  listeners.forEach((l) => l());
  return lastReport;
}

let installed = false;

/**
 * Detects a frozen UI: a tap that produces no click, or a tap that lands on a
 * node whose computed pointer-events is none. Both always emit a full report.
 */
export function installFreezeWatchdog() {
  if (installed || typeof window === "undefined") return () => {};
  installed = true;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let sawClick = false;

  const onDown = (x: number, y: number) => {
    lastPoint = { x, y };
    sawClick = false;

    const hit = document.elementFromPoint(x, y);
    const blocked =
      computedPE(document.body) === "none" ||
      computedPE(document.documentElement) === "none" ||
      (hit ? computedPE(hit) === "none" : false);
    if (blocked) reportFreeze("pointer-events:none under tryk");

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (sawClick) return;
      const el = document.elementFromPoint(x, y);
      const interactive = el?.closest(
        "button, a, input, textarea, select, [role='button'], [role='tab'], label",
      );
      if (interactive) reportFreeze("tryk på interaktivt element gav intet click");
    }, 800);
  };

  const onPointerDown = (e: PointerEvent) => onDown(e.clientX, e.clientY);
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0] ?? e.changedTouches[0];
    if (t) onDown(t.clientX, t.clientY);
  };
  const onClick = () => {
    sawClick = true;
  };

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("touchstart", onTouchStart, true);
  window.addEventListener("click", onClick, true);

  return () => {
    installed = false;
    if (timer) clearTimeout(timer);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("touchstart", onTouchStart, true);
    window.removeEventListener("click", onClick, true);
  };
}
