
## Sprog følger automatisk operativsystemet

I dag tjekker appen `navigator.language` ved første besøg, men kun hvis intet er gemt i localStorage. Så snart brugeren skifter sprog manuelt (eller får gemt en værdi), følger appen ikke længere telefonens sprog. Derudover bruger flere steder (`getStoredLang()` i `use-run-tracker.ts` og `useI18n`-fallback) en hårdkodet "en"-default i stedet for at tjekke OS-sproget.

### Ny adfærd

- Standardsprog = telefonens/browserens sprog:
  - `navigator.language` (eller `navigator.languages[0]`) starter med `da` → **Dansk**
  - alt andet → **Engelsk**
- Manuelt valg i Profil overstyrer stadig OS-sproget (gemt i `localStorage`), så en bruger der bevidst vælger fx Engelsk på en dansk telefon, bliver ved engelsk.
- Hvis intet er gemt manuelt, opdateres sproget automatisk efter OS — også på efterfølgende besøg.

### Implementering (`src/lib/i18n.tsx`)

1. **Ny hjælpefunktion `detectOSLang(): Lang`** — læser `navigator.language` + `navigator.languages`, returnerer `"da"` hvis nogen starter med `da`, ellers `"en"`. Bruges som eneste kilde til OS-sprog.
2. **`I18nProvider` init**: hvis intet er gemt → brug `detectOSLang()`. Hvis gemt værdi findes → brug den (manuelt valg vinder).
3. **`getStoredLang()`**: samme logik — gemt værdi vinder, ellers `detectOSLang()` (i dag har den allerede ca. denne logik, men opdateres til at bruge fælles helper og også tjekke `navigator.languages`).
4. **`useI18n` SSR/fallback-grenen**: bruger også `detectOSLang()` i stedet for hårdkodet `"en"`.
5. **Lyt på systemskift**: tilføj en `languagechange`-event listener på `window` i `I18nProvider`. Hvis brugeren ikke har et manuelt gemt valg, opdateres sproget live, når OS-sproget skifter.

### Ingen UI-ændringer

Sprogvælgeren i Profil bevares uændret som manuel override.

### Filer

- Redigeret: `src/lib/i18n.tsx`
