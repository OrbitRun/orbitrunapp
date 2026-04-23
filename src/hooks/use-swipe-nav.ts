import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

type SwipePath = "/" | "/history" | "/profile";

interface Options {
  prev?: SwipePath;
  next?: SwipePath;
}

const IGNORE_SELECTOR =
  '.mapboxgl-canvas, .mapboxgl-canvas-container, [role="slider"], input, textarea, select, button, a, [data-no-swipe]';

const H_THRESHOLD = 80; // min horizontal distance to count as a swipe
const V_TOLERANCE = 40; // max vertical drift allowed during the gesture
const DOMINANCE = 1.7; // |dx| must be at least this many times |dy|
const DIRECTION_LOCK = 12; // px moved before we lock to horizontal/vertical intent
const MAX_DURATION = 600; // ms; slower drags are treated as scrolls, not swipes

export function useSwipeNav<T extends HTMLElement = HTMLElement>(opts: Options) {
  const ref = useRef<T | null>(null);
  const navigate = useNavigate();
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let active = false;
    let locked: "h" | "v" | null = null;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      const target = e.target as Element | null;
      if (target && target.closest && target.closest(IGNORE_SELECTOR)) {
        active = false;
        return;
      }
      active = true;
      locked = null;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startT = Date.now();
    };

    const onMove = (e: TouchEvent) => {
      if (!active || locked) return;
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < DIRECTION_LOCK && Math.abs(dy) < DIRECTION_LOCK) return;
      // Lock direction on first meaningful movement; vertical lock cancels swipe.
      if (Math.abs(dy) >= Math.abs(dx)) {
        locked = "v";
        active = false;
      } else {
        locked = "h";
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startT;
      if (dt > MAX_DURATION) return;
      if (Math.abs(dx) < H_THRESHOLD) return;
      if (Math.abs(dy) > V_TOLERANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * DOMINANCE) return;

      const { prev, next } = optsRef.current;
      if (dx < 0 && next) {
        navigate({ to: next });
      } else if (dx > 0 && prev) {
        navigate({ to: prev });
      }
    };

    const onCancel = () => {
      active = false;
      locked = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [navigate]);

  return ref;
}
