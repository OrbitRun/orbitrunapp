import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
  onSubmit: (score: number) => void;
  onSkip: () => void;
};

export default function RpePrompt({ onSubmit, onSkip }: Props) {
  const { t } = useI18n();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-xl grid place-items-center px-5">
      <div className="w-full max-w-md rounded-3xl p-6 bg-background border border-white/10">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("rpe.eyebrow")}
        </div>
        <h2 className="mt-1 font-display font-black text-2xl tracking-tight">
          {t("rpe.title")}
        </h2>

        <div className="mt-6 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => onSubmit(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              className="aspect-square rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:scale-95 transition font-display font-black text-xl tabular text-foreground"
              aria-label={`RPE ${n}`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
          <span>1 · {t("rpe.veryEasy")}</span>
          <span>{t("rpe.maxEffort")} · 10</span>
        </div>

        <button
          onClick={onSkip}
          className="mt-6 w-full py-3 rounded-xl text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground border border-white/10 transition"
        >
          {t("rpe.skip")}
        </button>
      </div>
    </div>
  );
}
