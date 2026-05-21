## Problem

På skærmbilledet ses Mapbox-logoet og en vejtile øverst — uden for den afrundede kortboks — mens selve boksen står tom nedenunder. Det sker fordi:

1. `section` der holder kortet er sat til `flex-1` i den ydre `100dvh`-flex-kolonne, men har **ikke** `overflow-hidden`. Kun det indre `div` har `rounded-3xl overflow-hidden`.
2. Kort-`div`'en og chip/legend-overlays er **søskende** i samme section. Når flex-pladsen presses sammen (lille skærm + mange faste sektioner under), kollapser map-wrapperen i højde, mens Mapbox-canvas'et stadig renderes i sin sidst-målte størrelse og "rager ud" oven over containeren.
3. `min-h-[180px]` ligger både på section OG på map-wrapper — det dobbelt-binder ikke højden korrekt, og map-canvas'et resize'r ikke når parent skrumper.

## Løsning

Hold kortet og dets overlays i **ét fælles wrapper-element** med både `flex-1`, `min-h-[180px]`, `relative` og `overflow-hidden` — så bliver alt (canvas, GPS-chip, legend) klippet til den afrundede boks, og map-canvas'et følger altid parent-størrelsen.

### Konkret ændring i `src/routes/index.tsx` (linje ~251–302)

Nuværende struktur (forenklet):
```
<section relative flex-1 min-h-[180px] flex flex-col>
  <div flex-1 min-h-[180px] rounded-3xl overflow-hidden>
    <RunMap className="h-full w-full" />
  </div>
  <div absolute top-3 left-3> GPS chip </div>
  <div absolute bottom-3 right-3> legend </div>
</section>
```

Ny struktur:
```
<section className="relative flex-1 min-h-[200px] rounded-3xl overflow-hidden border border-border shadow-card">
  {indoor ? <IndoorPlaceholder className="absolute inset-0" />
          : <RunMap className="absolute inset-0 h-full w-full" /> }
  <div absolute top-3 left-3> GPS chip </div>
  <div absolute bottom-3 right-3> legend </div>
</section>
```

Detaljer:
- Flyt `rounded-3xl overflow-hidden border border-border shadow-card` op på selve `section`.
- Fjern den indre `div`-wrapper omkring `<RunMap>` (og om indoor-placeholder).
- Giv `<RunMap>` / placeholder `absolute inset-0` så de fylder boksen 1:1 uanset flex-rebalancering.
- Hæv `min-h` fra 180 → 200 px så Mapbox altid har plads til at vise tiles + attribution korrekt på små skærme (SE).
- Beholder de absolutte chip/legend som de er — de ligger nu inden i den klippede boks.

## Hvorfor det virker

- `overflow-hidden` på sectionen garanterer at ingen map-canvas-pixels nogensinde tegnes uden for den afrundede ramme — uanset hvad Mapbox internt måler.
- `absolute inset-0` på map-elementet fjerner enhver tvivl om højde-arv via flex; det fylder altid 100 % af forælder.
- Et niveau mindre DOM = en mindre kilde til layout-uoverensstemmelser mellem flex-children og absolute overlays.

## Ikke i scope

- Map-tracking, GPS-warmup, marker-logik (`RunMap.tsx`) — uændret.
- Øvrige sektioner (header, stats, start-knap, splits) — uændret.
