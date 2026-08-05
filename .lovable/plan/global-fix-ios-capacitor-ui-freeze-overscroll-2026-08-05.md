# Global fix: iOS/Capacitor UI freeze + overscroll

## Hvad jeg har fundet (verificeret i koden)

- Alle modaler/sheets bruger Radix (`src/components/ui/dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`) i `modal`-tilstand. Radix bruger `react-remove-scroll` + `FocusScope`, som sætter `overflow: hidden` og `pointer-events: none` på `body` samt fanger fokus. I WKWebView kan disse styles blive hængende, hvis unmount/animation afbrydes (fx når tastaturet ændrer viewport) — resultatet er præcis "hele appen låser": sko-vælger (`ShoePicker`), share (`ShareSheet` bruger `Sheet`), post-run og historik bruger alle disse primitives.
- Manuelle body-locks findes tre steder og kan overlappe/efterlade styles: `src/components/CoachInfoModal.tsx` (l. 22-26), `src/components/LegalSheet.tsx` (l. 24-28), `src/components/FocusRunView.tsx` (l. 107-114).
- `src/hooks/use-native-keyboard-fix.ts` blurrer aktivt element og kalder `window.scrollTo(0,0)` på `keyboardDidHide` — det kan selv stjæle fokus fra navnefeltet i onboarding, mens man skriver.
- Onboarding-inputtet har allerede ingen `autoFocus`, men ligger under `SplashScreen` (z-80, `pointer-events: none`) og har egne inline `touchAction`-styles.
- Der er intet app-shell scroll-lock: `html`/`body` scroller frit (`src/styles.css` sætter kun `overscroll-behavior: none`), og root-wrapperen i `src/routes/__root.tsx` er `min-h-screen pb-24 mb-[30px]` — derfor hvidt/tomt område over header og under footer ved overscroll.

## Plan

### 1. Låst app-shell viewport (styles.css + __root.tsx)
- `html, body, #root`: 100% bredde/højde, `margin: 0`, mørk baggrund, `overscroll-behavior: none`, `overflow: hidden`.
- Ny `.app-scroll-container`: `height: 100dvh`, `overflow-y: auto`, `overscroll-behavior-y: contain`, `-webkit-overflow-scrolling: touch`, plus `padding-top/bottom: env(safe-area-inset-*)`.
- `__root.tsx` wrapper skifter til `.app-scroll-container` (fjerner `mb-[30px]`, beholder bundpadding til BottomNav). Kun denne container scroller.

### 2. Fjern alle custom keyboard-fixes og manuelle body-locks
- Slet `src/hooks/use-native-keyboard-fix.ts` og kaldet i `__root.tsx`.
- Fjern body-style-manipulation i `CoachInfoModal`, `LegalSheet`, `FocusRunView` (shell'et låser allerede scroll).

### 3. Slå Radix scroll-/focus-lock fra på mobil
- I `ui/dialog.tsx`, `ui/sheet.tsx`, `ui/alert-dialog.tsx`: kør Root med `modal={false}` og giv `Content` `onOpenAutoFocus={(e) => e.preventDefault()}` + `onCloseAutoFocus={(e) => e.preventDefault()}`, så `react-remove-scroll` og FocusScope ikke rører body eller fanger tastaturfokus. Overlay/backdrop får eksplicit `pointer-events: auto` og fjernes fra DOM ved luk (ingen skjulte backdrops tilbage).

### 4. Global oprydnings-watchdog
- Ny `src/hooks/use-body-unlock.ts`, monteret i `__root.tsx`: ved hver route-ændring og ved app-resume nulstilles
  `document.body.style.overflow/position/pointerEvents` og `document.documentElement.style.overflow`, og forældreløse `[data-radix-portal]`-noder uden åbent content fjernes. Kører også som sikkerhedsnet efter hver modal-luk.

### 5. Midlertidig diagnostik
- Lille `logModalState(name, open)`-helper der ved åbning/lukning logger komponentnavn + aktuelle body/html-styles og `document.activeElement`. Kaldes fra ShoePicker, ShareSheet, post-run-dialoger, Onboarding. Kan ses i Xcode-konsollen og fjernes igen, når fejlen er bekræftet lukket.

### 6. Onboarding
- Ingen `autoFocus`, ingen focus trap, ingen `preventDefault()` på parent touch/pointer-handlers; kortet beholder kun `touch-action: manipulation` på knapper. Input får `fontSize: 16` (allerede) så iOS ikke zoomer.

## Teknisk

Filer der ændres: `src/styles.css`, `src/routes/__root.tsx`, `src/components/ui/{dialog,sheet,alert-dialog}.tsx`, `src/components/{CoachInfoModal,LegalSheet,FocusRunView,ShoePicker,ShareSheet,Onboarding}.tsx`, ny `src/hooks/use-body-unlock.ts` + `src/lib/modal-debug.ts`, slettet `src/hooks/use-native-keyboard-fix.ts`.

Verifikation i web-preview med Playwright: åbn/luk sko-vælger, share og post-run, og bekræft at `body.style.pointerEvents`/`overflow` er tomme efter luk, samt at kun `.app-scroll-container` scroller. Derefter kræves lokalt `npm run build:capacitor && npx cap sync ios` for at teste flows i TestFlight.
