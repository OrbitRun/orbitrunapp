

## Swipe mellem Løb, Historik og Profil

Tilføj horisontal swipe-navigation mellem de tre hovedsider, så brugeren kan swipe til venstre/højre for at skifte mellem `/` (Løb), `/history` (Historik) og `/profil` (Profil) — som i en native mobilapp. Bottom-nav forbliver uændret som alternativ navigation.

### Adfærd

- Swipe venstre på `/` → går til `/history`
- Swipe venstre på `/history` → går til `/profile`
- Swipe højre på `/profile` → går til `/history`
- Swipe højre på `/history` → går til `/`
- Swipe i enderne (højre på `/`, venstre på `/profile`) gør intet
- Swipe ignoreres hvis gesten starter på interaktive elementer der selv håndterer touch (kortet i `RunMap`, slidere, knapper). Vi tjekker `event.target` mod en liste af selectors (`.mapboxgl-canvas`, `[role="slider"]`, `input`, `button`, osv.) — hvis swipe starter inde i et af dem, ignoreres det.
- Kun horisontale swipes tæller (horisontal afstand > vertikal afstand, og > ~60px tærskel) — så vertikal scroll i historiklisten forstyrres ikke.
- Et aktivt løb (timer kører på `/`) blokerer ikke swipe — brugeren kan stadig se historik/profil mens et løb kører, præcis som bottom-nav allerede tillader.

### Implementering

1. **Ny hook `src/hooks/use-swipe-nav.ts`**
   - Tager `{ prev?: string, next?: string }` (route paths).
   - Returnerer en `ref` der bindes til side-containerens rod-element.
   - Lytter på `touchstart` / `touchmove` / `touchend` (passive listeners).
   - Filtrerer touches der starter inde i ignorerede selectors.
   - Ved succesfuld horisontal swipe (>60px, vinkel < 30°) kalder `useNavigate()` med target-pathen.

2. **Anvend hook i de tre routes**
   - `src/routes/index.tsx`: `useSwipeNav({ next: "/history" })`
   - `src/routes/history.tsx`: `useSwipeNav({ prev: "/", next: "/profile" })`
   - `src/routes/profile.tsx`: `useSwipeNav({ prev: "/history" })`
   - Ref bindes til `<main>` rod-elementet på hver side.

### Ingen UI-ændringer

Bottom-nav, layouts og indhold på siderne ændres ikke.

### Filer

- Ny: `src/hooks/use-swipe-nav.ts`
- Redigeret: `src/routes/index.tsx`, `src/routes/history.tsx`, `src/routes/profile.tsx`

