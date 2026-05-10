## Mål

Tilføj en ny sektion "Notifikationer" på profilsiden med to toggles:
1. **Træningspåmindelser** — påmind hvis ingen løbetur i 2 dage.
2. **Ugentlig opsummering** — hver mandag kl. 09:00 lokal tid.

Brug `@capacitor/local-notifications`. Når en toggle slås TIL og tilladelse mangler, vises iOS-permission-popup'en med det samme.

## Filer

### Ny: `src/lib/notifications.ts`
Web-safe wrapper omkring `@capacitor/local-notifications`:
- `ensurePermission()` — kalder `checkPermissions()`, og hvis ikke `granted`, kalder `requestPermissions()`. Returnerer boolean. På web (ikke-native) → no-op `false`.
- `scheduleInactivityReminder()` — planlægger notifikation 2 dage frem (id `1001`); rescheduleres ved hver ny løbetur. Bruger `at: Date` 48 timer fra nu.
- `cancelInactivityReminder()` — `cancel({ notifications: [{ id: 1001 }] })`.
- `scheduleWeeklySummary()` — planlægger gentagende notifikation hver mandag 09:00 (id `1002`) via `schedule.on = { weekday: 2, hour: 9, minute: 0 }` med `repeats: true` (Capacitor weekday: søndag=1).
- `cancelWeeklySummary()`.
- Tekster på dansk/engelsk via i18n-nøgler (eller hardkodede DA/EN baseret på `navigator.language`).

Alle kald wrappes i try/catch, plugin-imports lazy (`await import(...)`), så web-build ikke fejler.

### Opdateret: `src/lib/user-profile.ts`
Tilføj til `UserProfile`:
```ts
trainingReminderEnabled?: boolean;  // default false
weeklySummaryEnabled?: boolean;     // default false
```
Opdater `DEFAULT_PROFILE`.

### Opdateret: `src/routes/profile.tsx`
Ny sektion mellem eksisterende sektioner (fx efter "Lyd & Haptik" eller før "Integrationer") — følg eksisterende kort/sektion-mønster med `Bell`-ikon (allerede importeret).

To rækker med `Switch`:
- Træningspåmindelser — beskrivelse: "Påmind mig hvis jeg ikke har løbet i 2 dage"
- Ugentlig opsummering — beskrivelse: "Få ugens stats hver mandag kl. 09:00"

Toggle-handler:
```ts
const onToggle = async (key, value) => {
  if (value) {
    const ok = await ensurePermission();
    if (!ok) { toast.error("Tilladelse afvist"); return; }
    if (key === 'trainingReminderEnabled') await scheduleInactivityReminder();
    else await scheduleWeeklySummary();
  } else {
    if (key === 'trainingReminderEnabled') await cancelInactivityReminder();
    else await cancelWeeklySummary();
  }
  const next = { ...profile, [key]: value };
  setProfile(next); saveProfile(next);
};
```

### Opdateret: `src/hooks/use-run-tracker.ts` (lille tilføjelse)
Når en løbetur gemmes/færdiggøres og `trainingReminderEnabled` er aktiv: kald `scheduleInactivityReminder()` igen for at nulstille 48-timers timer.

### Opdateret: `docs/IOS_SETUP.md`
Tilføj note om at `@capacitor/local-notifications` skal `npx cap sync ios`, og at iOS automatisk håndterer permission-prompt — ingen ekstra Info.plist-nøgler nødvendige.

## Installation
`bun add @capacitor/local-notifications`

## Bemærkninger
- På web/preview er alt no-op — toggles kan slås til/fra uden fejl, men der sker intet.
- Ingen backend / cron — alt kører lokalt på enheden via iOS scheduler.
- Reset af 48-timers reminder ved ny run sker kun når appen er åben; det er accepteret begrænsning.
