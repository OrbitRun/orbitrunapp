## Mål

1. Lås farverne på Hero-boksene til **position**, ikke metric.
2. Tilføj **Hastighed (km/t)** som en valgbar metric til både Hero- og sekundær-felter (samt brugbar i FocusRunView).

---

## 1. Position-baseret farve på Hero-bokse

I dag styrer `EditableStat` hero-farven ud fra metric-id (`distance` → neon, `ghost` → grøn/rød). I `FocusRunView` er den hardcoded til `id === "distance"`.

**Ændring:**

- `src/components/EditableStat.tsx`
  - Ny prop `heroPosition?: "left" | "right"` (kun relevant når `variant="hero"`).
  - Hero-tal-farve bestemmes udelukkende af position:
    - `left` → `text-neon` + `glow-neon`
    - `right` → `text-foreground` (hvid/lysegrå)
  - Specialtilfælde for `ghost` (rød/grøn delta) bevares **kun** for sekundær-variant. I hero-positionen følger den positions-farven (efter brugerens ønske: "uanset hvilken datatype").
  - `accent`/`glow`-props påvirker ikke længere hero-farven (bliver no-op for hero).

- `src/routes/index.tsx`
  - Ved render af `layout.hero.map((id, i) => …)`: send `heroPosition={i === 0 ? "left" : "right"}`.

- `src/components/FocusRunView.tsx` (linje ~334)
  - Erstat `${id === "distance" ? "text-neon" : "text-foreground"}` med positions-baseret klasse: index 0 → `text-neon`, index 1 → `text-foreground`.

Labels og enheder forbliver `text-muted-foreground` (uændret).

---

## 2. Ny metric: Hastighed (km/t)

- `src/lib/stat-metrics.ts`
  - Tilføj `MetricId` værdi `"speed"`.
  - Tilføj `METRICS.speed`:
    - `labelKey: "stat.speed"`
    - `unitKey: "unit.kmh"`
    - `format`: brug nuværende pace (fallback til avg) → `3600 / paceSecPerKm`, vist med 1 decimal; tom værdi → `"—"`.
  - Tilføj `"speed"` til `ALL_METRIC_IDS` (så den dukker op i `MetricPicker`, som læser fra dette array).

- `src/lib/i18n.tsx`
  - Tilføj nøgler i både engelsk og dansk:
    - `"stat.speed"` → "Speed" / "Hastighed"
    - `"unit.kmh"` → "km/h" / "km/t"

`MetricPicker` viser automatisk alle ikke-brugte metrics, så ingen ændringer der. Brugeren kan vælge den til alle 5 felter.

---

## Tekniske noter

- Ingen ændringer i tracker-logik eller business-rules.
- Eksisterende layouts (gemt i localStorage pr. niveau) påvirkes ikke; brugeren tilføjer selv `speed` via long-press → picker.
- Ghost-metric i hero-position mister sin rød/grøn farvning (bevidst pr. krav). Anbefaling: ghost passer dårligt i venstre hero (altid neon) — vi kunne overveje at filtrere den ud af hero-picker, men gør det ikke nu medmindre du beder om det.

## Filer der ændres

- `src/components/EditableStat.tsx`
- `src/components/FocusRunView.tsx`
- `src/routes/index.tsx`
- `src/lib/stat-metrics.ts`
- `src/lib/i18n.tsx`
