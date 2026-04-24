import { useEffect, useState } from "react";
import { Footprints, Plus, Star, Trash2, AlertTriangle, Archive, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  addShoe,
  deleteShoe,
  loadShoes,
  setPrimaryShoe,
  shoeProgress,
  toggleRetireShoe,
  type Shoe,
  DEFAULT_MAX_M,
} from "@/lib/shoes";
import { useI18n } from "@/lib/i18n";
import { formatDistance } from "@/lib/run-utils";

export default function ShoesSection() {
  const { t } = useI18n();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Shoe | null>(null);

  // form state
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [startKm, setStartKm] = useState("");
  const [maxKm, setMaxKm] = useState("800");
  const [makePrimary, setMakePrimary] = useState(false);

  const refresh = () => setShoes(loadShoes());

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("orbit:shoes-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("orbit:shoes-updated", handler);
    };
  }, []);

  const resetForm = () => {
    setBrand("");
    setModel("");
    setStartKm("");
    setMaxKm("800");
    setMakePrimary(false);
  };

  const handleAdd = () => {
    if (!brand.trim() || !model.trim()) return;
    addShoe({
      brand,
      model,
      startingDistanceM: (parseFloat(startKm) || 0) * 1000,
      maxDistanceM: (parseFloat(maxKm) || 800) * 1000,
      makePrimary,
    });
    resetForm();
    setAddOpen(false);
    refresh();
  };

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Footprints className="h-4 w-4 text-neon" />
          <h2 className="font-display font-black text-sm uppercase tracking-[0.2em]">
            {t("shoes.title")}
          </h2>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="h-8 px-3 rounded-full bg-neon text-primary-foreground text-[10px] font-black uppercase tracking-[0.18em] flex items-center gap-1 active:scale-95 transition shadow-neon"
        >
          <Plus className="h-3 w-3" />
          {t("shoes.add")}
        </button>
      </div>

      {shoes.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center">
          <Footprints className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
          <p className="text-xs text-muted-foreground">{t("shoes.empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shoes.map((shoe) => (
            <ShoeCard
              key={shoe.id}
              shoe={shoe}
              onMakePrimary={() => {
                setPrimaryShoe(shoe.id);
                refresh();
              }}
              onRetire={() => {
                toggleRetireShoe(shoe.id);
                refresh();
              }}
              onDelete={() => setConfirmDelete(shoe)}
            />
          ))}
        </div>
      )}

      {/* Add shoe dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-xl">
              {t("shoes.addTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {t("shoes.addHint")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Field label={t("shoes.brand")}>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Nike"
                className="input-styled"
              />
            </Field>
            <Field label={t("shoes.model")}>
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Pegasus 41"
                className="input-styled"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("shoes.startKm")}>
                <input
                  value={startKm}
                  onChange={(e) => setStartKm(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  className="input-styled tabular"
                />
              </Field>
              <Field label={t("shoes.maxKm")}>
                <input
                  value={maxKm}
                  onChange={(e) => setMaxKm(e.target.value)}
                  type="number"
                  inputMode="decimal"
                  placeholder="800"
                  className="input-styled tabular"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={makePrimary}
                onChange={(e) => setMakePrimary(e.target.checked)}
                className="h-4 w-4 accent-[oklch(0.85_0.2_140)]"
              />
              {t("shoes.makePrimary")}
            </label>
          </div>

          <DialogFooter className="flex-row gap-2">
            <button
              onClick={() => {
                resetForm();
                setAddOpen(false);
              }}
              className="flex-1 h-11 rounded-xl bg-white/5 text-foreground/80 text-xs font-bold uppercase tracking-[0.18em] active:scale-95 transition"
            >
              {t("summary.cancel")}
            </button>
            <button
              onClick={handleAdd}
              disabled={!brand.trim() || !model.trim()}
              className="flex-1 h-11 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.18em] active:scale-95 transition shadow-neon disabled:opacity-40 disabled:shadow-none"
            >
              {t("shoes.save")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent className="glass-strong border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-black text-xl">
              {t("shoes.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {confirmDelete
                ? `${confirmDelete.brand} ${confirmDelete.model}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">
              {t("summary.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteShoe(confirmDelete.id);
                setConfirmDelete(null);
                refresh();
              }}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("summary.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style>{`
        .input-styled {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border-radius: 0.75rem;
          background: color-mix(in oklab, white 4%, transparent);
          border: 1px solid color-mix(in oklab, white 10%, transparent);
          color: inherit;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-styled:focus {
          border-color: oklch(0.85 0.2 140);
        }
      `}</style>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function ShoeCard({
  shoe,
  onMakePrimary,
  onRetire,
  onDelete,
}: {
  shoe: Shoe;
  onMakePrimary: () => void;
  onRetire: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const pct = shoeProgress(shoe);
  const warn = pct >= 0.9;
  const isRetired = shoe.status === "retired";
  const max = shoe.maxDistanceM || DEFAULT_MAX_M;

  return (
    <div
      className={`glass-strong rounded-2xl p-4 border-2 ${
        shoe.isPrimary && !isRetired
          ? "border-neon"
          : "border-border"
      } ${isRetired ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {shoe.isPrimary && !isRetired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neon text-primary-foreground text-[9px] font-black uppercase tracking-[0.18em]">
                <Star className="h-2.5 w-2.5 fill-current" />
                {t("shoes.primary")}
              </span>
            )}
            {isRetired && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground text-[9px] font-black uppercase tracking-[0.18em]">
                {t("shoes.retired")}
              </span>
            )}
          </div>
          <div className="font-display font-bold text-base mt-1 truncate">
            {shoe.brand} {shoe.model}
          </div>
        </div>
        <button
          onClick={onDelete}
          aria-label="delete"
          className="h-8 w-8 rounded-full grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between mb-1.5">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-2xl tabular text-foreground">
              {formatDistance(shoe.totalDistanceM)}
            </span>
            <span className="text-[10px] text-muted-foreground font-semibold">
              / {formatDistance(max)} {t("unit.km")}
            </span>
          </div>
          <span
            className={`text-[10px] font-black tabular ${
              warn ? "text-[oklch(0.7_0.22_45)]" : "text-neon"
            }`}
          >
            {Math.round(pct * 100)}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              warn
                ? "bg-gradient-to-r from-[oklch(0.75_0.18_60)] to-[oklch(0.65_0.24_30)]"
                : "bg-neon"
            }`}
            style={{ width: `${Math.min(100, pct * 100)}%` }}
          />
        </div>
        {warn && !isRetired && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-[oklch(0.75_0.2_50)] font-semibold">
            <AlertTriangle className="h-3 w-3" />
            {t("shoes.warn")}
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {!shoe.isPrimary && !isRetired && (
          <button
            onClick={onMakePrimary}
            className="flex-1 h-9 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/80 hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Star className="h-3 w-3" />
            {t("shoes.setPrimary")}
          </button>
        )}
        <button
          onClick={onRetire}
          className="flex-1 h-9 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/80 hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-1.5"
        >
          {isRetired ? (
            <>
              <RotateCcw className="h-3 w-3" />
              {t("shoes.reactivate")}
            </>
          ) : (
            <>
              <Archive className="h-3 w-3" />
              {t("shoes.retire")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
