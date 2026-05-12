## Problem

Sider kan ikke scrolle på iOS, fordi `capacitor.config.ts` har `ios.scrollEnabled: false`. Den indstilling slår WKWebView-scroll fra på top-niveau.

Kommentaren i filen antager at indre containere med klassen `.app-scroll` håndterer scroll i stedet — men `rg "app-scroll" src/` returnerer 0 hits. Klassen findes ikke i koden, så hele appen bliver låst statisk på enheden.

## Løsning

Slå scroll til igen i WKWebView og behold "native feel" via CSS, som allerede er sat op:

1. **`capacitor.config.ts`**: sæt `ios.scrollEnabled: true` (eller fjern feltet — `true` er default). Opdater kommentaren så den ikke længere refererer til en ikke-eksisterende `.app-scroll` konvention.
2. Behold `overscroll-behavior: none` i `src/styles.css` (allerede til stede) for at dæmpe rubber-banding så meget som muligt fra web-laget.
3. Genbyg + sync iOS:
   ```
   npm run build
   npx cap sync ios
   ```
   Ingen grund til at slette `ios/` — det er en ren JS-config-ændring.

## Hvorfor ikke beholde den nuværende strategi

For at slå top-level scroll fra og lade indre containere håndtere scroll, skulle hver side (`profile.tsx`, `history.tsx`, `index.tsx`, `run.$id.tsx`) wrappes i en fuld-højde overflow-container med `-webkit-overflow-scrolling: touch`. Det er en større refaktor som ikke er nødvendig for at få scroll til at virke nu — og rubber-band-effekten på iOS 16+ er allerede minimal når `overscroll-behavior: none` er sat på `html, body`.

## Filer der ændres

- `capacitor.config.ts` — `scrollEnabled: true`, opdateret kommentar.

Ingen ændringer i komponenter, hooks eller business-logik.