import { ShieldCheck } from "lucide-react";
import { useRecoverRun } from "@/hooks/use-recover-run";
import { useI18n } from "@/lib/i18n";
import { formatDistance, formatDuration } from "@/lib/run-utils";

export default function RecoverRunBanner() {
  const { snapshot, save, discard } = useRecoverRun();
  const { t } = useI18n();
  if (!snapshot) return null;

  return (
    <div className="mt-3 mb-3 rounded-2xl border border-neon/30 bg-gradient-to-br from-[oklch(0.18_0.04_160)] to-[oklch(0.12_0.02_160)] p-3 shadow-card">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-xl bg-neon/10 grid place-items-center text-neon">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.2em] text-neon font-bold leading-none">
            {t("recover.title")}
          </div>
          <div className="mt-1 text-xs text-foreground/85 leading-tight">
            {t("recover.body")}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground tabular">
            {formatDistance(snapshot.distanceM)} km · {formatDuration(snapshot.durationMs)}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          className="flex-1 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.18em] py-2 active:scale-95 transition"
        >
          {t("recover.save")}
        </button>
        <button
          onClick={discard}
          className="flex-1 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-[0.18em] py-2 active:scale-95 transition text-muted-foreground"
        >
          {t("recover.discard")}
        </button>
      </div>
    </div>
  );
}
