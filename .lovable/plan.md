## Mål

Forenkle Coach-siden så der kun er én samlet hero-boks (Orbit Coach + Dagens Form + Start-knap), efterfulgt af 2x2 grid med vitals/vejr og TRIMP-grafen nederst. Ingen separat "Dagens handling"-sektion.

## Ny struktur på `/coach`

```
[Header: COACH / Orbit Coach]
[Orbit Coach hero-kort]                ← samlet ny boks
  • Score + bånd (rest/easy/ready/prime) + progressbar
  • AI-besked (recommendation)
  • Næste pas (titel + summary, tilpasset readiness-bånd)
  • Plan-progress (uge x / total, %)
  • [START TRÆNING]  (stor neon-knap)
  • [Gem som plan]   (sekundær, lille)
[2x2 grid: Hvilepuls · HRV · TRIMP 7d · Vejr]
[Ugentlig TRIMP-graf]
```

Den eksisterende "Dagens handling"-sektion (`ReadinessActions`) fjernes som selvstændig boks, og dens logik (anbefalet pas ud fra readiness-bånd, save/start) flyttes ind i den samlede coach-boks.

## Filændringer

**`src/components/CoachCard.tsx` — omskrives til den nye samlede boks**
- Tilføjer hooks: `useVitals`, `useHrZones`, `useCurrentEnv`, `loadRuns` → kalder `computeReadiness` for score + bånd + recommendation.
- Bruger samme `recommendedSession(band, baseSession, lang)` logik som i `ReadinessActions` (rest → walk, easy → easy run, ellers coach.next session).
- Topsektion: bånd-eyebrow + score (stort, farvet efter bånd) + tynd progressbar (samme stil som `ReadinessPanel`).
- AI-besked: `t(r.recommendationKey, r.recommendationParams)` med `Sparkles`-ikon.
- Næste pas: titel + summary i et `bg-white/5`-felt.
- Z5-override-banner bevares.
- Plan-progress strip bevares nederst.
- CTA: `Start træning` (neon, fuld bredde) → `savePlannedSession({session, band, score})` + `navigate({ to: "/", search: { autostart: 1 } })`.
- Sekundær: `Gem som plan` (toast) + den eksisterende `Vis detaljer`-toggle.
- Unconfigured-state forbliver uændret (onboarding-kortet).

**`src/components/ReadinessPanel.tsx` — slankes til 2x2 grid**
- Behold `MiniStat`-grid med Hvilepuls / HRV / TRIMP 7d / Vejr.
- Fjern score-header, progressbar, bånd-label og recommendation (de bor nu i coach-boksen).
- Behold de to bund-CTAs ("log vitals", "personalize") når relevant.

**`src/components/ReadinessActions.tsx` — slettes**

**`src/routes/coach.tsx`**
- Ny rækkefølge: `<CoachCard>` → `<ReadinessPanel>` → `<WeeklyTrimpBreakdown>`.
- Fjern `<ReadinessActions />` import + brug.

**`src/routes/index.tsx` — autostart fra Coach**
- Læs `?autostart=1` via `Route.useSearch()` (tilføj `validateSearch` på rute-definitionen så search er typed: `{ autostart?: 1 }`).
- Når `autostart === 1` og `t.status === "idle"`: kald `beginCountdown()` én gang i en `useEffect` med en lokal `useRef`-guard, og ryd parameter via `navigate({ to: "/", replace: true })` så reload ikke gentager.
- Den planlagte session er allerede i `localStorage` via `savePlannedSession`; eksisterende `DailyStatusStrip` viser den.

**`src/lib/i18n.tsx`**
- Genbrug eksisterende `coach.actions.startWorkout` / `startRecovery` / `savePlan` / `saved` til den nye knap.
- Ingen nye nøgler nødvendige (alt findes allerede fra tidligere iteration).

## Teknisk note

- `Route` for `/` opdateres med `validateSearch: (s) => ({ autostart: s.autostart === "1" || s.autostart === 1 ? 1 : undefined })` så TanStack Router-typecheck holder.
- Autostart-effect kører kun når brugeren er på Run-tabben med `idle/finished` og ikke under et igangværende run.
- Hydration-mismatch i runtime errors (vejr `16°` vs `—`) løses ved at lade `MiniStat` rendere `—` initielt og opdatere efter mount — `useCurrentEnv` returnerer allerede `null` på server, så at flytte grid'et bag en `mounted`-flag i `ReadinessPanel` fjerner mismatchet.

## Resultat

Brugeren får én klar handling pr. dag direkte i toppen af Coach-tabben: se score + besked, tryk "Start træning" → lander på Run-tabben med countdown i gang og det anbefalede pas planlagt.
