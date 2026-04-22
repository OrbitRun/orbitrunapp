import { useEffect, useMemo, useRef, useState } from "react";
import { Trophy } from "lucide-react";
import { computePersonalBests, PR_DISTANCES, type PersonalBest } from "@/lib/personal-bests";
import { loadRuns } from "@/lib/run-types";
import { formatDuration } from "@/lib/run-utils";
import { useI18n } from "@/lib/i18n";

const LABELS_EN: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  half: "Half marathon",
  full: "Marathon",
};

const LABELS_DA: Record<string, string> = {
  "5k": "5 km",
  "10k": "10 km",
  half: "Halvmarathon",
  full: "Marathon",
};

function formatDate(ts: number, lang: string) {
  const d = new Date(ts);
  return d.toLocaleDateString(lang === "da" ? "da-DK" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PRCarousel() {
  const { lang, t } = useI18n();
  const [prs, setPrs] = useState<PersonalBest[]>([]);
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => setPrs(computePersonalBests(loadRuns()));
    refresh();
    window.addEventListener("orbit:run-saved", refresh);
    return () => window.removeEventListener("orbit:run-saved", refresh);
  }, []);

  // Auto-play every 4s
  useEffect(() => {
    if (prs.length <= 1) return;
    intervalRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % prs.length);
    }, 4000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [prs.length]);

  const labels = lang === "da" ? LABELS_DA : LABELS_EN;
  const ordered = useMemo(
    () =>
      PR_DISTANCES.map((d) => prs.find((p) => p.id === d.id)).filter(
        (p): p is PersonalBest => Boolean(p),
      ),
    [prs],
  );

  if (ordered.length === 0) return null;
  const current = ordered[index] ?? ordered[0];

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
          {t("pr.title")}
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-bold">
          {ordered.length} PR
        </div>
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[oklch(0.18_0.02_180)] via-[oklch(0.12_0.02_180)] to-[oklch(0.08_0.01_200)] shadow-card">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-neon/15 blur-3xl pointer-events-none" />
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {ordered.map((pr) => (
            <div key={pr.id} className="min-w-full p-5 relative">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-neon/15 grid place-items-center text-neon">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-bold">
                    {t("pr.best")}
                  </div>
                  <div className="font-display font-black text-lg leading-tight">
                    {labels[pr.id]}
                  </div>
                </div>
              </div>
              <div className="mt-4 font-display font-black tabular text-[44px] leading-none text-foreground">
                {formatDuration(pr.durationMs)}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                {formatDate(pr.achievedAt, lang)}
              </div>
            </div>
          ))}
        </div>
      </div>
      {ordered.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {ordered.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to ${labels[p.id]}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-neon shadow-neon" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
