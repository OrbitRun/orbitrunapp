import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ghost } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSwipeNav } from "@/hooks/use-swipe-nav";
import {
  loadPrs,
  recomputeAllPrs,
  PR_ORDER,
  type PrCategory,
  type PrMap,
} from "@/lib/personal-records";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { loadRuns } from "@/lib/run-types";
import { selectGhost } from "@/lib/ghost-runner";

export const Route = createFileRoute("/records")({
  component: RecordsPage,
});

function formatValue(category: PrCategory, value: number): string {
  if (category === "longest") return `${formatDistance(value)} km`;
  return formatDuration(value);
}

function formatDateShort(ts: number, lang: string): string {
  return new Date(ts).toLocaleDateString(lang === "da" ? "da-DK" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RecordsPage() {
  const { t, lang } = useI18n();
  const swipeRef = useSwipeNav<HTMLElement>({ prev: "/history", next: "/profile" });
  const [prs, setPrs] = useState<PrMap>({});

  useEffect(() => {
    // Always rebuild on mount so the page reflects every saved run, even
    // if PRs were not yet computed for legacy data.
    setPrs(recomputeAllPrs());
    const onUpdate = () => setPrs(loadPrs());
    window.addEventListener("orbit:new-pr", onUpdate);
    return () => window.removeEventListener("orbit:new-pr", onUpdate);
  }, []);

  return (
    <main ref={swipeRef} className="mx-auto max-w-md px-4 pt-[max(env(safe-area-inset-top),1rem)]">
      <header className="py-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
          {t("pr.eyebrow")}
        </div>
        <h1 className="font-display font-black text-3xl tracking-tight">{t("pr.title")}</h1>
      </header>

      <section className="space-y-3 mt-2">
        {PR_ORDER.map((cat) => {
          const entry = prs[cat];
          return (
            <div
              key={cat}
              className="glass rounded-2xl px-4 py-4"
            >
              <div className="flex items-center justify-between">
                <div className="font-display font-black text-lg tracking-tight">
                  {t(`pr.cat.${cat}`)}
                </div>
                <div className="font-mono font-bold text-xl text-neon tabular">
                  {entry ? formatValue(cat, entry.value) : (
                    <span className="text-muted-foreground/60 font-display">—</span>
                  )}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground/80">
                {entry
                  ? t("pr.dateSet", { date: formatDateShort(entry.achievedAt, lang) })
                  : t("pr.notDone")}
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
