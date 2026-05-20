## Mål

Gøre den almindelige run-side (`/` — "Start a run"-skærmen i `src/routes/index.tsx`) lige så skærm-adaptiv som **Focus Run**, så hele skærmen er udnyttet og intet kritisk indhold ligger under fold på små telefoner (SE) eller skæres af på store (Pro Max).

## Hvad er forskellen i dag

**FocusRunView (godt):**
- `height: 100dvh` + safe-area top/bottom padding
- `display: flex; flex-direction: column` med `flex: 1 1 0` på map-området → fyld resten af skærmen
- Ingen scroll (`body.overflow = hidden`)
- Alle elementer (timer, stats, map, kontroller) er altid synlige

**Run-siden i `index.tsx` (problem):**
- `max-w-md` container uden højde-styring → scroll-baseret
- Hardcoded `h-[221px]` på map/placeholder
- Bunden (kontroller, stats) kan ryge under fold på 375×667 (iPhone SE), og toppen får for meget luft på 430×932 (Pro Max)
- Bottom-nav + safe-area ikke trukket fra → indhold kan ligge under nav

## Hvad bygges

### 1. Flex-column shell (samme mønster som FocusRunView)
```
height: 100dvh
padding-top: max(env(safe-area-inset-top), 0.5rem)
padding-bottom: calc(bottom-nav-h + max(env(safe-area-inset-bottom), 0.5rem))
display: flex; flex-direction: column; gap: 12px
```

### 2. Zone-baseret layout (top → bottom)
```
┌─ Header (auto)        — greeting + GPS chip
├─ Daily status (auto)  — readiness strip
├─ Map / placeholder    — flex: 1 1 0  (fylder resten)
├─ Primary action       — Start-knap (auto, sticky-feel)
└─ Secondary row (auto) — mode chips, music, shoes
```
- Fjern `h-[221px]` på map → bliver dynamisk via `flex: 1 1 0` med `min-height: 180px`
- Sekundære sektioner (records, history-link, etc.) flyttes til scrollbart område **under** den primære skærm eller bag en "More"-toggle, så første-skærm altid passer

### 3. Adaptiv typografi & spacing
- Greeting `text-2xl` på sm, `text-3xl` fra 390px+
- `gap-3` ved højde <700, `gap-4` ved højde ≥700 (via `@container` eller media query)
- Tap-targets fastholdes ≥44px

### 4. Bottom-nav clearance
Tilføj `--bottom-nav-h` CSS-variabel (sat i `BottomNav`) som run-siden trækker fra, så Start-knappen aldrig overlapper nav.

### 5. Test-matrix (verificeres med viewport switcher)
- 320×568 (SE 1. gen) — alt skal være tilgængeligt, evt. komprimeret
- 375×667 (SE 2/3)
- 390×844 (iPhone 14)
- 430×932 (Pro Max)
- 820×1180 (iPad)

## Ikke i scope
- Focus Run / Indoor Run (allerede adaptive)
- History, Profile, Coach (separate redesigns hvis ønsket)
- Funktionel ændring af run-tracker, GPS, musik

## Teknisk note
Bruger `100dvh` (dynamic viewport) for at undgå iOS Safari address-bar hop. Fallback til `100vh` via `@supports not (height: 100dvh)` hvis nødvendigt.
