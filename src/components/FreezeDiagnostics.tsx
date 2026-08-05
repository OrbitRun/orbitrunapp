// Temporary on-device diagnostics for the iOS/Capacitor freeze.
//
// Shows exactly what is (or isn't) blocking touches: body/html inline styles,
// how many Radix portals are still mounted, and which element is actually
// under the last touch point.

import { useEffect, useRef, useState } from "react";
import { Bug } from "lucide-react";

type Snapshot = {
  bodyStyle: string;
  htmlStyle: string;
  portals: number;
  lastTouch: string;
  elementAtTouch: string;
  activeElement: string;
};

function describe(el: Element | null): string {
  if (!el) return "none";
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof (el as HTMLElement).className === "string"
      ? `.${(el as HTMLElement).className.trim().split(/\s+/).slice(0, 4).join(".")}`
      : "";
  const pe = getComputedStyle(el).pointerEvents;
  return `${el.tagName.toLowerCase()}${id}${cls} [pointer-events:${pe}]`;
}

export default function FreezeDiagnostics() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isNative = !!(
      window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
    ).Capacitor?.isNativePlatform?.();
    const forced = new URLSearchParams(window.location.search).get("diag") === "1";
    setVisible(isNative || forced);

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0] ?? e.changedTouches[0];
      if (t) touch.current = { x: t.clientX, y: t.clientY };
    };
    const onPointer = (e: PointerEvent) => {
      touch.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("touchstart", onTouch, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("touchstart", onTouch, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, []);

  const capture = () => {
    const p = touch.current;
    setSnap({
      bodyStyle: document.body.style.cssText || "(tom)",
      htmlStyle: document.documentElement.style.cssText || "(tom)",
      portals: document.querySelectorAll("[data-radix-portal]").length,
      lastTouch: p ? `${Math.round(p.x)}, ${Math.round(p.y)}` : "ingen",
      elementAtTouch: p ? describe(document.elementFromPoint(p.x, p.y)) : "n/a",
      activeElement: describe(document.activeElement),
    });
    setOpen(true);
  };

  if (!visible) return null;

  return (
    <>
      <button
        type="button"
        onClick={capture}
        aria-label="Diagnostics"
        className="fixed z-[100] right-2 h-9 w-9 rounded-full bg-black/70 border border-white/20 grid place-items-center text-neon"
        style={{ top: "calc(env(safe-area-inset-top) + 8px)" }}
      >
        <Bug className="h-4 w-4" />
      </button>
      {open && snap && (
        <div
          className="fixed inset-x-2 z-[101] rounded-2xl border border-white/15 bg-black/90 p-3"
          style={{ top: "calc(env(safe-area-inset-top) + 52px)" }}
        >
          <pre className="text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
{`body.style: ${snap.bodyStyle}
html.style: ${snap.htmlStyle}
radix portals: ${snap.portals}
last touch: ${snap.lastTouch}
elementFromPoint: ${snap.elementAtTouch}
activeElement: ${snap.activeElement}`}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={capture}
              className="flex-1 rounded-lg bg-white/10 py-2 text-xs font-bold"
            >
              Opdater
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-lg bg-neon py-2 text-xs font-bold text-primary-foreground"
            >
              Luk
            </button>
          </div>
        </div>
      )}
    </>
  );
}
