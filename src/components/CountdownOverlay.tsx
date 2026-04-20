import { useEffect, useState } from "react";
import { beep, speakGo } from "@/lib/audio-cues";

type Props = {
  seconds?: number;
  onComplete: () => void;
  onCancel: () => void;
};

export default function CountdownOverlay({ seconds = 10, onComplete, onCancel }: Props) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) {
      speakGo();
      const id = setTimeout(onComplete, 250);
      return () => clearTimeout(id);
    }
    if (count <= 3) beep(880, 140, 0.3);
    const id = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center backdrop-blur-2xl bg-background/70 animate-fade-in"
      role="dialog"
      aria-label="Run starting countdown"
    >
      <div className="flex flex-col items-center gap-10 px-6">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-bold">
          Get ready
        </div>
        <div
          key={count}
          className="font-display font-black text-neon tabular leading-none text-[180px] drop-shadow-[0_0_40px_oklch(0.92_0.21_130/0.55)] animate-scale-in"
          aria-live="assertive"
        >
          {count > 0 ? count : "GO"}
        </div>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onComplete}
            className="px-8 py-3 rounded-full bg-neon text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm shadow-neon active:scale-95 transition"
          >
            Start now
          </button>
          <button
            onClick={onCancel}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground font-semibold py-2 px-4 hover:text-foreground transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
