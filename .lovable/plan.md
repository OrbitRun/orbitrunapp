## Problem

Kortet renderer kun en sort firkant / en lille stribe (kun Mapbox-attribution synlig). Årsagen er en class-konflikt + højde-kollaps:

1. **Class-konflikt i `RunMap`**: Den interne container er hardcodet `className={\`relative ${className ?? ""}\`}`. Vi sender `"absolute inset-0 h-full w-full"` ind, så det endelige class-sæt bliver `relative absolute inset-0 h-full w-full`. Begge sætter `position`, og rækkefølgen er ikke garanteret — i praksis vinder `relative`, så `inset-0` har ingen effekt, og containeren falder tilbage til `h-full` af en forælder uden eksplicit højde.

2. **Højde-kollaps i flex-kolonnen**: `<section>` har `flex-1 min-h-[200px]` inden i en ydre `flex flex-col` med `minHeight: 100dvh`. `flex-1` på en flex-item giver kun højde til *children med h-full* hvis flex-itemet selv har en målt højde — på små viewports + mange faste sektioner ender flex-itemet i praksis på sin min-height (200px), og `h-full` på map-canvas regnes mod en uafklaret højde → Mapbox måler 0px → kun den 24px attribution-stribe vises.

3. På preview (390×701, 100dvh = 701px) konkurrerer header + status-strip + recover-banner + stats + splits + start-knap + bundnav om pladsen. Sum af faste sektioner > tilgængelig højde, så `flex-1` bliver presset under sin min-h, og Mapbox-canvas'et får ingen synlig højde.

## Løsning

Tre små, kirurgiske ændringer — alle visuelle / layout, ingen logik.

### 1. `src/components/RunMap.tsx` — fjern class-konflikt

Skift container-div'en fra:
```tsx
<div ref={containerRef} className={`relative ${className ?? ""}`}>
```
til:
```tsx
<div ref={containerRef} className={className ?? "relative"}>
```

Så respekterer den callerens positionering (`absolute inset-0 …`) i stedet for at tvinge `relative`. Den enkelte eksisterende caller der ikke sender positioning (run-detail / replay) får default `"relative"`.

### 2. `src/routes/index.tsx` — giv kort-sektionen en målbar højde

Skift kort-sektionen fra:
```tsx
<section className="relative flex-1 min-h-[200px] rounded-3xl overflow-hidden …">
```
til:
```tsx
<section
  className="relative flex-1 rounded-3xl overflow-hidden border border-border shadow-card"
  style={{ minHeight: "clamp(220px, 38dvh, 460px)" }}
>
```

`clamp(220px, 38dvh, 460px)` giver:
- Mindst 220 px på iPhone SE → ingen sort/strib
- ~38 % af viewport på normale telefoner (390×844 → 320 px)
- Loft på 460 px så Pro Max ikke får et kæmpe kort der skubber start-knappen ud

### 3. `src/routes/index.tsx` — sørg for at flex-kolonnen kan vokse forbi 100dvh

Skift ydre container fra `minHeight: "100dvh"` til samme + `height: "auto"` og lad bundnav-clearance være som den er. Det betyder: hvis indholdet faktisk er højere end viewport, må siden scrolle (i stedet for at presse kortet til 0 px). Run-page'en er stadig "uden scroll" på almindelige telefoner, men på SE / med banner + ghost-strip aktiv falder vi pænt tilbage til en kort scroll i stedet for en sort kort-boks.

## Hvorfor det virker

- **(1)** fjerner CSS-konflikten så `absolute inset-0` faktisk gælder → Mapbox-canvas'et fylder 100 % af den klippede ramme.
- **(2)** giver kort-sectionen en garanteret synlig højde (min 220 px) der ikke kan kollapse under flex-pres → Mapbox måler reel størrelse → tiles tegnes.
- **(3)** forhindrer at fremtidige tilføjelser (banners, advarsler) igen presser kortet til 0.

## Ikke i scope

- `RunMap`-tracking, GPS-warmup, marker-logik — uændret.
- Andre route-filer (history, run-detail, replay) — bruger `RunMap` med default class og påvirkes ikke af (1).
- Stats / splits / start-knap / bundnav — uændret.
