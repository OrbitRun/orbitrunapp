import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { loadPrs, PR_ORDER, type PrCategory } from "@/lib/personal-records";
import { formatDistance, formatDuration } from "@/lib/run-utils";

type Detail = { runId: string; categories: PrCategory[] };

function formatValue(category: PrCategory, value: number): string {
  if (category === "longest") return `${formatDistance(value)} km`;
  return formatDuration(value);
}

export default function PrAchievement() {
  const { t } = useI18n();
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const onPr = (e: Event) => {
      const ce = e as CustomEvent<Detail>;
      if (!ce.detail?.categories?.length) return;
      setDetail(ce.detail);
      try {
        if ("vibrate" in navigator) navigator.vibrate([60, 60, 120]);
      } catch {
        /* noop */
      }
    };
    window.addEventListener("orbit:new-pr", onPr as EventListener);
    return () => window.removeEventListener("orbit:new-pr", onPr as EventListener);
  }, []);

  useEffect(() => {
    if (!detail) return;
    const id = setTimeout(() => setDetail(null), 4500);
    return () => clearTimeout(id);
  }, [detail]);

  if (!detail) return null;

  const prs = loadPrs();
  const improved = PR_ORDER.filter((c) => detail.categories.includes(c)).map((c) => prs[c]).filter(
    (e): e is NonNullable<typeof e> => !!e,
  );

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-background/80 px-6"
      onClick={() => setDetail(null)}
    >
      <div className="glass-strong rounded-3xl px-6 py-6 max-w-sm w-full animate-scale-in text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-neon/15 grid place-items-center">
          <Trophy className="h-6 w-6 text-neon" />
        </div>
        <h2 className="mt-4 font-display font-black text-xl tracking-tight">
          {t("pr.newPr")}
        </h2>
        <ul className="mt-4 space-y-2">
          {improved.map((e) => (
            <li
              key={e.category}
              className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"
            >
              <span className="text-sm font-bold">{t(`pr.cat.${e.category}`)}</span>
              <span className="text-sm font-mono font-bold text-neon">
                {formatValue(e.category, e.value)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-semibold">
          {t("pr.tapContinue")}
        </div>
      </div>
    </div>
  );
}
