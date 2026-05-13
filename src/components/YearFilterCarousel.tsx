import { useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useI18n } from "@/lib/i18n";

export type YearSelection = number | "all";

type Props = {
  years: number[];
  selected: YearSelection;
  onChange: (year: YearSelection) => void;
};

export default function YearFilterCarousel({ years, selected, onChange }: Props) {
  const { t } = useI18n();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    dragFree: true,
    loop: false,
    containScroll: "trimSnaps",
  });

  // Re-init when the year list changes so Embla recomputes snap points.
  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, years.length]);

  const items: { key: string; label: string; value: YearSelection }[] = [
    { key: "all", label: t("history.allTime"), value: "all" },
    ...years.map((y) => ({ key: String(y), label: String(y), value: y as YearSelection })),
  ];

  return (
    <nav
      aria-label={t("history.yearFilter")}
      className="mb-3 -mx-4 px-4 overflow-hidden"
      ref={emblaRef}
    >
      <div className="flex items-end gap-5 border-b border-white/5">
        {items.map((it) => {
          const active = it.value === selected;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.value)}
              aria-pressed={active}
              className={[
                "relative shrink-0 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.22em] transition-colors",
                active ? "text-neon" : "text-muted-foreground hover:text-foreground/80",
              ].join(" ")}
            >
              {it.label}
              <span
                aria-hidden
                className={[
                  "absolute left-0 right-0 -bottom-px h-0.5 rounded-full transition-all",
                  active ? "bg-neon opacity-100" : "bg-transparent opacity-0",
                ].join(" ")}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
