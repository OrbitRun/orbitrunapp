import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Activity, Ghost } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useI18n } from "@/lib/i18n";
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
import { bestVo2MaxFromRuns, classifyFitnessByProfile } from "@/lib/vo2max";
import { useUserProfile } from "@/hooks/use-user-profile";

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

export default function RecordsCarousel() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const profile = useUserProfile();
  const [prs, setPrs] = useState<PrMap>({});
  const [vo2Best, setVo2Best] = useState<{ value: number; achievedAt: number } | null>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: false, loop: false });
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    setPrs(recomputeAllPrs());
    const refresh = () => {
      setPrs(loadPrs());
      setVo2Best(bestVo2MaxFromRuns(loadRuns()));
    };
    refresh();
    window.addEventListener("orbit:new-pr", refresh);
    window.addEventListener("orbit:run-updated", refresh);
    return () => {
      window.removeEventListener("orbit:new-pr", refresh);
      window.removeEventListener("orbit:run-updated", refresh);
    };
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  return (
    <section className="mb-4">
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold px-1 pb-2">
        {t("records.carousel.eyebrow")}
      </div>
      <div className="overflow-hidden -mx-4 px-4" ref={emblaRef}>
        <div className="flex gap-3">
          {PR_ORDER.map((cat) => {
            const entry = prs[cat];
            return (
              <div
                key={cat}
                className="glass rounded-2xl px-4 py-4 min-w-0 shrink-0 grow-0 basis-[85%]"
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
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-muted-foreground/80 truncate">
                    {entry
                      ? t("pr.dateSet", { date: formatDateShort(entry.achievedAt, lang) })
                      : t("pr.notDone")}
                  </div>
                  {entry && (
                    <button
                      type="button"
                      onClick={() => {
                        const run = loadRuns().find((r) => r.id === entry.runId);
                        if (!run) return;
                        selectGhost(run, t(`pr.cat.${cat}`));
                        navigate({ to: "/" });
                      }}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/80 flex-shrink-0"
                      aria-label={t("ghost.race")}
                    >
                      <Ghost className="h-3 w-3" />
                      {t("ghost.race")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {PR_ORDER.map((cat, i) => (
          <button
            key={cat}
            type="button"
            aria-label={`Go to ${cat}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === selected ? "w-4 bg-neon" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
