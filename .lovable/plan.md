## Mål
Når brugeren vælger erfaringsniveau **Pro** (`expert`), skal det forudvalgte sekundære stat-felt **Stigning** (elevation) erstattes af **Puls** (hrBpm).

## Hvor
`src/lib/stat-metrics.ts` – objektet `LEVEL_LAYOUTS.expert`:

```ts
expert: {
  hero: ["distance", "pace"],
  secondary: ["duration", "cadence", "elevation"], // ← elevation skiftes til hrBpm
},
```

## Ændring
Skift `"elevation"` → `"hrBpm"` i `expert.secondary`, så Pro-layoutet bliver:

```ts
expert: {
  hero: ["distance", "pace"],
  secondary: ["duration", "cadence", "hrBpm"],
},
```

## Påvirkning
- Kun standardlayoutet for Pro ændres. Brugere som allerede har gemt et tilpasset layout (i `localStorage` under `orbit:stat-layout:v2:expert`) bevarer deres valg – `loadLayout` falder kun tilbage til standarden, hvis der ikke findes et gemt layout.
- Recreational/Motionist-layoutet er uændret.
- Brugeren kan stadig manuelt vælge Stigning igen via MetricPicker.

## Ingen øvrige filer skal ændres.
