## Problem

Den nye overscroll-lås gjorde `body` til `position: fixed; inset: 0` og introducerede en `.app-scroll`-wrapper som ny scroll-container. Det ændrer hvordan viewport-højden og safe-area-insets opfører sig i web-preview, så `BottomNav` (`fixed bottom-0`) ender med at lægge sig oven på Start-knappen, mens der dukker tom plads op under nav'en. På iOS er rubber-band allerede slået fra via `ios.scrollEnabled: false` i `capacitor.config.ts` — CSS-hacket er ikke nødvendigt.

## Løsning

Fjern `.app-scroll`-konstruktionen og lad body være den naturlige scroll-container igen, men behold de uskadelige dele (`overscroll-behavior: none`).

### `src/styles.css`
Fjern denne blok i bunden:
```css
html, body { overscroll-behavior: none; overflow: hidden; }
body { position: fixed; inset: 0; }
.app-scroll { position: absolute; inset: 0; overflow-y: auto; ... }
```
`overscroll-behavior: none` findes allerede i `@layer base` på html/body — den bevares. Ingen ændring til den eksisterende base-regel.

### `src/routes/__root.tsx`
Fjern `<div className="app-scroll">`-wrapperen, så strukturen er tilbage til:
```tsx
<I18nProvider>
  <div className="min-h-screen pb-24 mb-[30px]">
    <Outlet />
    <BottomNav />
    <PrAchievement />
  </div>
  <SplashScreen />
</I18nProvider>
```

### `capacitor.config.ts`
Uændret. `ios.scrollEnabled: false` står stadig og håndterer WKWebView-bouncen på iOS — det var hele formålet med UI-låsen.

## Filer der ændres
- `src/styles.css` (fjern bunden af filen tilføjet i sidste runde)
- `src/routes/__root.tsx` (fjern `.app-scroll`-wrapper)

## Resultat
- BottomNav sidder igen korrekt i bunden af viewport uden at dække Start-knappen.
- Ingen tom plads under nav'en.
- iOS rubber-banding er stadig deaktiveret via Capacitor-config'en.
