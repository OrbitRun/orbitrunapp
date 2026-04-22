import { useEffect, useState } from "react";
import { Footprints, Plus, Star, Trash2 } from "lucide-react";
import {
  addShoe,
  loadShoes,
  removeShoe,
  setActiveShoe,
  DEFAULT_MAX_M,
  type Shoe,
} from "@/lib/shoes";
import { useI18n } from "@/lib/i18n";

export default function ShoeTracker() {
  const { t, lang } = useI18n();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [adding, setAdding] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [maxKm, setMaxKm] = useState<number>(DEFAULT_MAX_M / 1000);

  useEffect(() => {
    setShoes(loadShoes());
    const refresh = () => setShoes(loadShoes());
    window.addEventListener("orbit:shoes-change", refresh);
    return () => window.removeEventListener("orbit:shoes-change", refresh);
  }, []);

  const submit = () => {
    if (!brand.trim() && !model.trim()) return;
    addShoe({
      brand: brand.trim() || (lang === "da" ? "Mærke" : "Brand"),
      model: model.trim() || (lang === "da" ? "Model" : "Model"),
      maxDistanceM: Math.max(50, maxKm) * 1000,
    });
    setBrand("");
    setModel("");
    setMaxKm(DEFAULT_MAX_M / 1000);
    setAdding(false);
  };

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-1.5">
          <Footprints className="h-3 w-3 text-neon" />
          {t("shoes.title")}
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon/10 text-neon text-[10px] font-bold uppercase tracking-[0.18em] active:scale-95 transition"
          >
            <Plus className="h-3 w-3" /> {t("shoes.add")}
          </button>
        )}
      </div>

      {adding && (
        <div className="glass-strong rounded-2xl p-4 mb-3 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t("shoes.brand")}
              className="bg-transparent border-b-2 border-white/10 focus:border-neon outline-none py-2 text-sm font-bold transition"
              maxLength={24}
            />
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("shoes.model")}
              className="bg-transparent border-b-2 border-white/10 focus:border-neon outline-none py-2 text-sm font-bold transition"
              maxLength={24}
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              {t("shoes.maxKm")}
            </label>
            <input
              type="number"
              value={maxKm}
              min={50}
              max={2000}
              onChange={(e) => setMaxKm(Number(e.target.value) || 0)}
              className="mt-1 w-full bg-transparent border-b-2 border-white/10 focus:border-neon outline-none py-1.5 text-sm font-mono font-bold transition"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(false)}
              className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground"
            >
              {t("summary.cancel")}
            </button>
            <button
              onClick={submit}
              className="flex-1 py-2 rounded-xl bg-neon text-primary-foreground text-xs font-black uppercase tracking-[0.18em] shadow-neon"
            >
              {t("shoes.save")}
            </button>
          </div>
        </div>
      )}

      {shoes.length === 0 && !adding && (
        <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">
          {t("shoes.empty")}
        </div>
      )}

      <ul className="space-y-2">
        {shoes.map((s) => {
          const pct = Math.min(100, (s.distanceM / s.maxDistanceM) * 100);
          const km = (s.distanceM / 1000).toFixed(1);
          const maxK = (s.maxDistanceM / 1000).toFixed(0);
          const warn = pct >= 90;
          return (
            <li
              key={s.id}
              className={`glass rounded-2xl p-3 ${s.active ? "border border-neon/40 shadow-neon" : ""}`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveShoe(s.id)}
                  className={`h-9 w-9 rounded-xl grid place-items-center transition ${
                    s.active
                      ? "bg-neon text-primary-foreground"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                  aria-label={t("shoes.setActive")}
                >
                  <Star className="h-4 w-4" fill={s.active ? "currentColor" : "none"} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-black text-sm truncate">
                    {s.brand} <span className="text-foreground/70 font-bold">{s.model}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground tabular">
                    {km} / {maxK} km
                  </div>
                </div>
                <button
                  onClick={() => removeShoe(s.id)}
                  className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive transition"
                  aria-label={t("shoes.remove")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    warn ? "bg-destructive" : "bg-neon shadow-neon"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
