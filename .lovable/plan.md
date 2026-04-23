

## Reduce bottom navigation height by 30%

The nav-pillen er for høj. Vi reducerer den vertikale padding på de to hovedled (pillen og linkene) med ca. 30% for at gøre nav-baren lavere uden at ændre layout, ikon-størrelse eller safe-area-clearance.

### Ændring

**`src/components/BottomNav.tsx`**
- Pillens padding: `py-3.5` (14px) → `py-2` (8px) — ~43% lavere container-padding.
- Link-padding: `py-3` (12px) → `py-2` (8px) — ~33% lavere link-højde.
- Resultat: samlet pille-højde reduceres fra ~76px til ~54px (~29% lavere), tæt på de ønskede 30%.
- Ikon (`h-5 w-5`), label (`text-[10px]`), gap (`gap-1`) og safe-area `pb-[max(env(safe-area-inset-bottom),12px)]` forbliver uændrede, så iOS-clearance bevares.

### Filer

- Redigeret: `src/components/BottomNav.tsx`

