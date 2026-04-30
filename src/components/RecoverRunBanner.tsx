import { ShieldCheck, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatDistance, formatDuration } from "@/lib/run-utils";
import { useRecoverRun } from "@/hooks/use-recover-run";

export default function RecoverRunBanner() {
  const { t } = useI18n();
  const { snapshot, save, discard } = useRecoverRun();
  if (!snapshot) return null;
  return (
    <div className="mt-3 rounded-2xl border border-neon/30 bg-gradient-to-br from-[oklch(0.18_0.04_160)] to-[oklch(0.10_0.01_160)] p-3 shadow-card">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-neon/15 grid place-items-center text-neon flex-shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.25em] text-neon font-black">
            {t("recover.title")}
          </div>
          <div className="mt-1 text-xs text-foreground/90 leading-snug">
            {t("recover.body")}
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground tabular">
            {formatDistance(snapshot.distanceM)} · {formatDuration(snapshot.durationMs)}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-xl bg-neon py-2 text-xs font-bold text-primary-foreground active:scale-[0.98] transition"
            >
              {t("recover.save")}
            </button>
            <button
              type="button"
              onClick={discard}
              aria-label={t("recover.discard")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-bold hover:bg-white/10 transition inline-flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              {t("recover.discard")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
