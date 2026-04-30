## Fix: "Gå til opsætning" skal åbne Coach Onboarding

I dag scroller knappen i `CoachInfoModal` blot ned til lyd/haptik-sektionen i bunden af Profile. Den skal i stedet åbne selve **Coach Onboarding** (det modal med de 3-4 spørgsmål: niveau, frekvens, mål, evt. distance) — samme flow som "Konfigurér" / "Tilpas" knappen i Orbit Coach-rækken bruger.

### Ændringer

**`src/routes/profile.tsx`**
- Erstat `onNavigateToSettings={handleNavigateToAudioSettings}` med en handler der sætter `setCoachOpen(true)` (samme state der allerede styrer `<CoachOnboarding>`).
- Fjern den nu ubrugte `handleNavigateToAudioSettings` funktion og `audioSectionRef` (ref + import af `useRef` hvis ikke længere brugt andre steder — tjekkes og bevares hvis nødvendigt).
- Fjern `ref={audioSectionRef}` og `scroll-mt-4` fra audio-sektionen.

**`src/components/CoachInfoModal.tsx`**
- Ingen API-ændringer; prop `onNavigateToSettings` beholder navnet (kalder bare det nye handler). Modal lukker stadig efter klik, hvorefter Coach Onboarding mounter ovenpå.

### Resultat
Brugeren trykker info-ikonet ved Orbit Coach → ser modal-forklaring → trykker "Gå til opsætning" → modal lukker og Coach Onboarding (3-4 spørgsmål) åbner med det samme.
