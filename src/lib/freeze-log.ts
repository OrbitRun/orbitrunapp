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

export type DiagnosticEvent = {
  t: number;
  type: string;
  target: string;
  tracked: string;
  detail: string;
};

export type ProbeElement = {
  element: string;
  pointerEvents: string;
  zIndex: string;
  rect: string;
  disabled: boolean;
  ariaHidden: string;
  inert: boolean;
};

const LIFECYCLE_LIMIT = 40;
const lifecycle: LifecycleEvent[] = [];
const diagnosticEvents: DiagnosticEvent[] = [];
let probeStack: ProbeElement[] = [];
let probePoint = "ingen";
let probeArmed = false;

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

function notify() {
  listeners.forEach((listener) => listener());
}

function pushDiagnostic(type: string, target: Element | null, detail = "") {
  const trackedElement = target?.closest?.("[data-diag-target]") as HTMLElement | null;
  diagnosticEvents.push({
    t: Date.now(),
    type,
    target: describeElement(target),
    tracked: trackedElement?.dataset.diagTarget ?? "—",
    detail,
  });
  if (diagnosticEvents.length > 80) diagnosticEvents.shift();
  notify();
}

export function logDiagnosticEvent(type: string, target: Element | null, detail = "") {
  pushDiagnostic(type, target, detail);
}

export function armProbeMode() {
  probeArmed = true;
  pushDiagnostic("probe-armed", null);
}

export function isProbeArmed() {
  return probeArmed;
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
  probePoint: string;
  probeStack: ProbeElement[];
  eventLog: string[];
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
    probePoint,
    probeStack: [...probeStack],
    eventLog: diagnosticEvents.slice(-24).map((event) => {
      const time = new Date(event.t).toISOString().slice(11, 23);
      return `${time} ${event.type} tracked=${event.tracked} target=${event.target}${event.detail ? ` ${event.detail}` : ""}`;
    }),
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
    `probe: ${r.probePoint} (${r.probeStack.length} elementer)`,
    ...r.probeStack.map(
      (item, index) =>
        `  ${index + 1}. ${item.element} pe=${item.pointerEvents} z=${item.zIndex} rect=${item.rect} disabled=${item.disabled} aria-hidden=${item.ariaHidden} inert=${item.inert}`,
    ),
    "lifecycle:",
    ...(r.lifecycle.length ? r.lifecycle.map((l) => `  ${l}`) : ["  (tom)"]),
    "events:",
    ...(r.eventLog.length ? r.eventLog.map((event) => `  ${event}`) : ["  (tom)"]),
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

  const eventDetail = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) {
      return `defaultPrevented=${event.defaultPrevented}`;
    }
    const inputEvent = event instanceof InputEvent ? event : null;
    return `value=${JSON.stringify(target.value)} data=${JSON.stringify(inputEvent?.data ?? null)} inputType=${inputEvent?.inputType ?? "—"} defaultPrevented=${event.defaultPrevented}`;
  };

  const onCapturedEvent = (event: Event) => {
    pushDiagnostic(event.type, event.target as Element | null, eventDetail(event));
  };

  const captureProbe = (x: number, y: number) => {
    probeArmed = false;
    probePoint = `${Math.round(x)}, ${Math.round(y)}`;
    probeStack = document.elementsFromPoint(x, y).map((element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        element: describeElement(element),
        pointerEvents: style.pointerEvents,
        zIndex: style.zIndex,
        rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        disabled: "disabled" in html ? Boolean((html as HTMLButtonElement).disabled) : false,
        ariaHidden: html.getAttribute("aria-hidden") ?? "false",
        inert: html.inert,
      };
    });
    pushDiagnostic("probe-captured", document.elementFromPoint(x, y), `stack=${probeStack.length}`);
    window.setTimeout(() => reportFreeze("probe mode hit-test"), 350);
  };

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
  const onProbePointerDown = (e: PointerEvent) => {
    if (probeArmed) captureProbe(e.clientX, e.clientY);
  };
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0] ?? e.changedTouches[0];
    if (t) onDown(t.clientX, t.clientY);
  };
  const onClick = () => {
    sawClick = true;
  };

  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("pointerdown", onProbePointerDown, true);
  window.addEventListener("touchstart", onTouchStart, true);
  window.addEventListener("click", onClick, true);
  const capturedTypes = [
    "pointerdown",
    "pointerup",
    "touchstart",
    "touchend",
    "click",
    "beforeinput",
    "input",
    "change",
  ] as const;
  capturedTypes.forEach((type) => window.addEventListener(type, onCapturedEvent, true));

  return () => {
    installed = false;
    if (timer) clearTimeout(timer);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("pointerdown", onProbePointerDown, true);
    window.removeEventListener("touchstart", onTouchStart, true);
    window.removeEventListener("click", onClick, true);
    capturedTypes.forEach((type) => window.removeEventListener(type, onCapturedEvent, true));
  };
}
