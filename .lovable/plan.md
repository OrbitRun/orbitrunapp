## Goal

Gøre løberuter visuelt konsistente: tempo-farvet i historikken, neongrøn med glød under live-løb, og ensartet stregtykkelse på tværs af live, historik og share-billeder.

## Changes

### 1. `src/components/RunMap.tsx` — fjern den dominerende sorte border + tilføj glød

Den nuværende opsætning lægger en 6px helt sort linje under en 4px farvet linje. Det betyder at:
- I **heatmap-mode** (historik) bliver tempo-farverne visuelt overdøvet af den sorte ramme — det er det, der får ruten til at se "sort" ud.
- I **live-mode** ses neonen ikke som neon, fordi den sorte ramme stjæler kontrasten.

Opdater `map.on("load", …)` blokken (lines 99–132):

- **Heatmap-mode (historik):** drop den sorte border helt. Render kun det farvede segment-lag (`line-width: 5`, `line-cap/join: round`, `line-color` fra `properties.color`). Farvegradienten fra `buildPaceSegmentsFromPoints` (neon → amber → rød) er allerede den samme skala som legenden under kortet.
- **Live-mode (ikke-heatmap):** erstat den sorte border med et neon glow-lag, og hold hovedlinjen neongrøn:
  - Glow-lag: `line-width: 14`, `line-color: <neon>`, `line-opacity: 0.35`, `line-blur: 8`.
  - Hovedlinje: `line-width: 5`, `line-color: <neon>`, `line-opacity: 1`.
- Begge modes: brug `line-cap: round`, `line-join: round`.

Logikken splittes pænt ved at branchge på `heatmap`-prop'en når lagene tilføjes (eller via `paint`-betingede expressions). Holder eksisterende `readNeonColor()`-helper.

### 2. `src/lib/share-card-v2.ts` — ensartet stregtykkelse

Ændr `ctx.lineWidth = 8` (line 108) til `ctx.lineWidth = 5` for at matche kort-stregen. Glow er ikke nødvendigt på share-card (statisk billede), men `strokeStyle = NEON` beholdes.

### 3. Ingen ændringer i opkaldssites
`history.tsx` og `RunSummary.tsx` bruger allerede `heatmap`-prop'en korrekt; `FocusRunView.tsx` bruger live-mode (uden heatmap). Ingen call-site ændringer.

## Visuelt resultat

- **Historik & run-summary:** ruten skinner i tempo-farver fra neon (hurtig) → rød (langsom), perfekt matchet med legenden under kortet. Ingen sort overlay.
- **Live-løb:** klar neongrøn streg med blød glød oven på det mørke Mapbox-tema — meget mere "alive".
- **Share-kort:** samme neon, samme 5px tykkelse → konsistent brand-look.

## Verifikation

1. `/` → start et løb → kortet viser neongrøn streg med glow.
2. `/history` → kortene viser farvede ruter (ikke sorte) der matcher fast/slow legenden.
3. Åbn et historisk løb → samme tempo-heatmap i `RunSummary`.
4. Trigger share-card export → PNG'en har 5px neon-rute uden synlig sort kant.
