## Goal

Fjern `shadow-neon` (neon glow) fra alle knapper i appen, inkl. "Next/Back" i onboarding-flowet. Dekorative ikke-knap-elementer (avatar, coach pulse-cirkler, stat-badges) bevarer deres glow.

## Ændringer

Fjern `shadow-neon` (og `focus:shadow-neon` på inputs) fra knap-classNames i følgende filer:

- `src/components/Onboarding.tsx` — Next/Back-knapper + input focus-glow
- `src/components/CoachOnboarding.tsx` — Next/Back-knapper + "Lad os løbe"-CTA
- `src/components/CoachInfoModal.tsx` — primær CTA
- `src/components/HealthPermissionSheet.tsx` — tilladelses-CTA
- `src/components/WeatherEditor.tsx` — "Gem"-CTA + valgt vejr-chip
- `src/components/RecoverRunBanner.tsx` — accept-knap
- `src/components/RunSummary.tsx` — gem/del-knap
- `src/components/LegalSheet.tsx` — accept-knap
- `src/components/ShoesSection.tsx` — tilføj/gem-knap
- `src/components/MetricPicker.tsx` — valgt metric-chip
- `src/routes/index.tsx` — "Start run"-badge + play-knap

## Bevares (ikke knapper)

- `src/routes/profile.tsx` — avatar-cirkel
- `src/components/CoachOnboarding.tsx` linje 371/389 — pulse/high-five animationscirkler
- `src/components/EditableStat.tsx` — edit-badge
- `.shadow-neon` / `.glow-neon` utilities i `src/styles.css` forbliver (bruges stadig af ovenstående)

## Resultat

Alle interaktive knapper bliver flade (beholder `active:scale-95` feedback), mens dekorative neon-accenter på avatar og animationer er uændrede.
