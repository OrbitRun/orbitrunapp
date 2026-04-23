import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

type SwipePath = "/" | "/history" | "/profile";

interface Options {
  prev?: SwipePath;
  next?: SwipePath;
}

const IGNORE_SELECTOR =
  '.mapboxgl-canvas, .mapboxgl-canvas-container, [role="slider"], input, textarea, select, button, a, [data-no-swipe]';

const THRESHOLD = 60;
const MAX_ANGLE_RATIO = 0.5; // |dy|/|dx| < 0.5 → roughly < ~26°

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
    let active = false;

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
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < THRESHOLD) return;
      if (Math.abs(dy) / Math.abs(dx) > MAX_ANGLE_RATIO) return;

      const { prev, next } = optsRef.current;
      if (dx < 0 && next) {
        navigate({ to: next });
      } else if (dx > 0 && prev) {
        navigate({ to: prev });
      }
    };

    const onCancel = () => {
      active = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onCancel, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [navigate]);

  return ref;
}
