import { useEffect, useState } from "react";
import logo from "@/assets/08a0cc02-81da-4cc6-89d2-2c567d41b102.png";

const SESSION_KEY = "orbit.splash.shown";
const VISIBLE_MS = 3000;
const FADE_MS = 300;

export default function SplashScreen() {
  const [mounted, setMounted] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return !sessionStorage.getItem(SESSION_KEY);
    } catch {
      return true;
    }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!mounted) return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore (private mode)
    }
    const t1 = window.setTimeout(() => setFading(true), VISIBLE_MS);
    const t2 = window.setTimeout(() => setMounted(false), VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{
        backgroundImage: "var(--gradient-dark)",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute inline-block h-28 w-28 rounded-full pulse-ring" />
        <img
          src={logo}
          alt="ORBIT RUN"
          className="relative h-28 w-28 object-contain drop-shadow-[0_0_24px_oklch(0.92_0.21_130/0.55)] animate-heart-thump"
          style={{ animationDuration: "1.6s" }}
        />
      </div>
      <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
        ORBIT RUN
      </div>
    </div>
  );
}
