import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { ALL_METRIC_IDS, METRICS, type MetricId } from "@/lib/stat-metrics";

type Props = {
  open: boolean;
  current: MetricId | null;
  used: MetricId[];
  onSelect: (id: MetricId) => void;
  onOpenChange: (open: boolean) => void;
};

export default function MetricPicker({ open, current, used, onSelect, onOpenChange }: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-xl">
            {t("edit.pickMetric")}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {t("edit.pickHint")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {ALL_METRIC_IDS.map((id) => {
            const isCurrent = id === current;
            const isUsed = used.includes(id) && !isCurrent;
            return (
              <button
                key={id}
                onClick={() => onSelect(id)}
                disabled={isUsed}
                className={`relative px-3 rounded-xl font-bold uppercase tracking-[0.12em] transition active:scale-95 text-xs py-[10px] ${
                  isCurrent
                    ? "bg-neon text-primary-foreground"
                    : isUsed
                      ? "bg-white/5 text-muted-foreground/40 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 text-foreground"
                }`}
              >
                {isCurrent && <Check className="absolute top-1.5 right-1.5 h-3 w-3" />}
                {t(METRICS[id].labelKey)}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
