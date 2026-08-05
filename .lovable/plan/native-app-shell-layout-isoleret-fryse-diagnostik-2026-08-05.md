# Native app-shell layout + isoleret fryse-diagnostik

## Hvad der er galt nu (verificeret i koden)

- `src/styles.css` (l. 134-181) sætter `overflow: hidden` på `html, body, #root` og lader `.app-scroll-container` være `height: 100dvh` med **både** `padding-top` og `padding-bottom` fra safe area. Samtidig lægger `src/routes/__root.tsx` (l. 110) `pb-28` på indholdswrapperen og `BottomNav` (l. 29) lægger `pb-[max(env(safe-area-inset-bottom),12px)]` oveni — safe-area-bunden tælles altså **tre gange** → stort tomt/hvidt felt i bunden.
- Safe-area-toppen tælles **to gange**: container-padding i `.app-scroll-container` plus `pt-[max(env(safe-area-inset-top),1rem)]` i hver route (`index`, `history`, `coach`, `profile`, `run.$id`, `profile_.heart-rate`, `RunSummary`) → forsiden skubbes for langt ned.
- `BottomNav` er `position: fixed` og ligger uden for scroll-containeren, mens startknappen ligger i indholdet med bundpadding baseret på `env(safe-area-inset-bottom)+6rem` — den matcher ikke navigationens faktiske højde, så knappen kan ende bag navigationen.
- Kortet er `h-[clamp(160px,28dvh,280px)]` (`src/routes/index.tsx` l. 243/255) — for lavt på store skærme.
- Baggrund: `html/body/#root` har `#020b0f`, men route-containere og WebView-baggrund arver ikke eksplicit, så hvide flader kan slippe igennem ved overscroll.

## Plan

### 1. Rul den brede overflow/dvh-ændring tilbage og indfør et rigtigt app-shell

- `src/styles.css`: `html, body, #root` beholder kun `margin: 0`, `width: 100%`, `min-height: 100%`, `background: #020b0f`, `overscroll-behavior: none`. Fjern global `overflow: hidden` og fjern `.app-scroll-container` helt.
- Nye klasser:
  - `.app-shell` — `height/min-height: 100dvh`, `overflow: hidden`, `display: flex; flex-direction: column`, mørk baggrund.
  - `.app-content` — `flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: none; -webkit-overflow-scrolling: touch; padding-top: env(safe-area-inset-top)`.
  - `.bottom-nav` — `flex: 0 0 auto; padding-bottom: env(safe-area-inset-bottom)`.
  - `--bottom-nav-height: 68px` som CSS-variabel på `:root`.
  - `.run-page-content` — `padding-bottom: calc(var(--bottom-nav-height) + 16px)`.
  - `.run-map` — `height: clamp(260px, 38dvh, 460px)`.

### 2. Safe area kun ét sted

- `src/routes/__root.tsx`: `<div class="app-shell">` → `<div class="app-content"><Outlet/></div>` + `<BottomNav/>` som flex-søskende (ikke længere `fixed`, ikke længere `pb-28`).
- `src/components/BottomNav.tsx`: skift `fixed bottom-0 … pb-[max(env(...))]` ud med `.bottom-nav` (i normal flow). Behold `focus-mode`-skjul.
- Fjern `pt-[max(env(safe-area-inset-top),1rem)]` fra alle routes (`index`, `history`, `coach`, `profile`, `run.$id`, `profile_.heart-rate`) og `RunSummary` — erstattes af almindelig `pt-4`, da `.app-content` nu står for safe-area-toppen.
- Fjern bund-safe-area fra `src/routes/index.tsx` (`[padding-bottom:calc(env(...)+6rem)]`) → `.run-page-content`.
- `profile_.heart-rate.tsx` sticky bundbar og `HealthPermissionSheet`/`LegalSheet`/`FocusRunView` beholder deres egen safe-area-bund, da de er overlays uden for `.app-content`.

### 3. Kort og startknap

- `src/routes/index.tsx`: kortcontainer og placeholder skifter til `.run-map` (`clamp(260px, 38dvh, 460px)`).
- Startknappen bliver i indholdet; `.run-page-content` reserverer plads over navigationen, så den altid er synlig.

### 4. Ingen hvide flader

- Mørk baggrund eksplicit på `html`, `body`, `#root`, `.app-shell`, `.app-content` og i `index.capacitor.html`-body, plus `background-color` på WebView-roden.

### 5. Frysning: diagnosticér før flere fixes

Ingen yderligere globale body-/pointer-fixes fjernes eller tilføjes i denne omgang. I stedet:

- Ny `src/components/FreezeDiagnostics.tsx` (flydende lille knap, kun synlig når `?diag=1` eller på native): viser `document.body.style.cssText`, `document.documentElement.style.cssText`, antal `[data-radix-portal]`, samt `document.elementFromPoint(x, y)` for sidste touch-koordinat (opsamlet via global `touchstart`-listener i capture-fase). Resultatet vises i et `<pre>` og kan kopieres.
- Behold eksisterende `logModalState`-logs i Dialog/Sheet/AlertDialog/ShoePicker/ShareSheet/Onboarding, så konsollen i Xcode kan sammenholdes med panelet.
- Testflows der skal køres i Capacitor iOS og rapporteres: onboarding med tastatur, sko-vælger, del løb. Panelet aflæses umiddelbart efter en frysning, så vi kan se om det er `body.pointer-events`, en forældreløs portal eller et usynligt overlay der fanger touch — først derefter laves den egentlige fix.

## Teknisk

Filer der ændres: `src/styles.css`, `src/routes/__root.tsx`, `src/components/BottomNav.tsx`, `src/routes/{index,history,coach,profile,run.$id,profile_.heart-rate}.tsx`, `src/components/RunSummary.tsx`, `index.capacitor.html`; ny `src/components/FreezeDiagnostics.tsx`.

Verifikation i preview med Playwright ved 393x852 (iPhone-lignende): ingen dobbelt-padding i top/bund, bundnav i flow, startknap synlig, kort mellem 260 og 460 px. Derefter `npm run build:capacitor && npx cap sync ios` og aflæsning af diagnostics-panelet i TestFlight for at fastslå fryse-årsagen.
