import { useEffect } from "react";
import { Activity, Volume2, Wind, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function CoachInfoModal({
  open,
  onClose,
  onNavigateToSettings,
}: {
  open: boolean;
  onClose: () => void;
  onNavigateToSettings: () => void;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const bullets = [
    { Icon: Activity, title: t("coach.info.bullet1.title"), body: t("coach.info.bullet1.body") },
    { Icon: Wind, title: t("coach.info.bullet2.title"), body: t("coach.info.bullet2.body") },
    { Icon: Volume2, title: t("coach.info.bullet3.title"), body: t("coach.info.bullet3.body") },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coach-info-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm glass rounded-2xl border border-neon/20 shadow-card animate-scale-in overflow-hidden"
      >
        {/* Neon glow accent */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-neon/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.92 0.21 130 / 0.5), transparent)" }}
        />

        {/* Header */}
        <div className="relative flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              Orbit Lab
            </div>
            <h2
              id="coach-info-title"
              className="mt-1 font-display font-black text-2xl tracking-tight"
            >
              {t("coach.info.title")}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("coach.info.close")}
            className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Intro */}
        <p className="relative px-5 text-sm text-muted-foreground leading-relaxed">
          {t("coach.info.intro")}
        </p>

        {/* Bullets */}
        <ul className="relative mt-4 px-5 space-y-3">
          {bullets.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/5 grid place-items-center text-neon shrink-0 ring-1 ring-neon/20">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{title}</div>
                <div className="text-xs text-muted-foreground leading-snug mt-0.5">{body}</div>
              </div>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="relative px-5 pt-5 pb-5 mt-2">
          <button
            onClick={() => {
              onNavigateToSettings();
              onClose();
            }}
            className="w-full h-12 rounded-xl bg-neon text-primary-foreground font-black text-sm uppercase tracking-[0.14em] shadow-neon active:scale-[0.98] transition"
          >
            {t("coach.info.cta")}
          </button>
        </div>
      </div>
    </div>
  );
}
