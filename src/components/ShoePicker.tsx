import { Check, Footprints, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { loadShoes, type Shoe } from "@/lib/shoes";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { useFreezeTrace, useOverlayTrace } from "@/hooks/use-freeze-trace";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentShoeId?: string;
  onSelect: (shoeId: string | null) => void;
};

export default function ShoePicker({ open, onOpenChange, currentShoeId, onSelect }: Props) {
  const { t } = useI18n();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  useFreezeTrace("ShoePicker");
  useOverlayTrace("ShoePicker", open);

  useEffect(() => {
    if (open) {
      setShoes(loadShoes().filter((s) => s.status === "active"));
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display font-black text-xl">
            {t("run.shoe.pickerTitle")}
          </DialogTitle>
        </DialogHeader>

        <ul className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto">
          {shoes.map((s) => {
            const selected = s.id === currentShoeId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl glass active:scale-[0.98] transition text-left"
                >
                  <Footprints className="h-4 w-4 text-neon flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">
                      {s.brand} {s.model}
                    </div>
                    {s.isPrimary && (
                      <div className="text-[10px] uppercase tracking-wider text-neon font-bold">
                        {t("shoes.primary")}
                      </div>
                    )}
                  </div>
                  {selected && <Check className="h-4 w-4 text-neon flex-shrink-0" />}
                </button>
              </li>
            );
          })}

          {shoes.length === 0 && (
            <li className="text-center text-sm text-muted-foreground py-6">
              {t("shoes.empty")}
            </li>
          )}

          <li>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/60 active:scale-[0.98] transition text-left text-muted-foreground"
            >
              <X className="h-4 w-4 flex-shrink-0" />
              <div className="flex-1 text-sm font-semibold">{t("run.shoe.unassign")}</div>
              {!currentShoeId && <Check className="h-4 w-4 flex-shrink-0" />}
            </button>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
