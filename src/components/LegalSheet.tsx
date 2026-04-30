import { useEffect } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Kind = "privacy" | "terms";

export default function LegalSheet({
  open,
  onClose,
  kind,
}: {
  open: boolean;
  onClose: () => void;
  kind: Kind;
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

  const items =
    kind === "privacy"
      ? [1, 2, 3, 4].map((n) => ({
          title: t(`legal.privacy.${n}.title`),
          body: t(`legal.privacy.${n}.body`),
        }))
      : [1, 2, 3].map((n) => ({
          title: t(`legal.terms.${n}.title`),
          body: t(`legal.terms.${n}.body`),
        }));

  const title = t(kind === "privacy" ? "legal.privacy.title" : "legal.terms.title");
  const intro = t(kind === "privacy" ? "legal.privacy.intro" : "legal.terms.intro");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-white/10 bg-gradient-to-br from-[oklch(0.14_0.02_160)] to-[oklch(0.09_0.01_160)] shadow-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        }}
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neon font-bold">
              {t("legal.section")}
            </div>
            <h2 className="mt-1 font-display font-black text-xl tracking-tight leading-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label={t("legal.close")}
            className="h-9 w-9 grid place-items-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <p className="text-sm leading-relaxed text-foreground/85">{intro}</p>

          <ol className="space-y-3">
            {items.map((it, i) => (
              <li
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 shrink-0 rounded-lg bg-neon/15 text-neon grid place-items-center text-[11px] font-black tabular">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-neon font-bold">
                      {it.title}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
                      {it.body}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="px-5 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.18em] py-3 active:scale-95 transition shadow-neon"
          >
            {t("legal.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
