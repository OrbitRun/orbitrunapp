## Problem

I den native Capacitor-app åbner "Forbind"-knappen Spotify-loginnet i en in-app browser. Når brugeren kommer retur via `jonas-orbit-run://callback`, kører deep-link-listeneren i `src/lib/spotify.ts` korrekt: token udveksles, gemmes i native storage, og eventet `orbit:spotify-authed` dispatches.

Men `MusicIntegrationSection` lytter aldrig på det event. Resultat:
- `busy` blev sat til `true` da brugeren klikkede Connect og bliver aldrig nulstillet (intet `finally`).
- `authed`/`playlist` læses kun i `useEffect` ved mount, så UI'et opdateres ikke når token bliver sat efter redirect.

UI'et sidder derfor fast på "Forbinder…" indtil brugeren manuelt genindlæser profilen.

## Fix

Opdater **`src/components/MusicIntegrationSection.tsx`**:

1. Tilføj `useEffect` der lytter på `window` events:
   - `orbit:spotify-authed` → `setAuthed(isAuthed())`, `setPlaylist(getActiveWorkoutPlaylist())`, `setBusy(false)`, toast success.
   - `orbit:spotify-auth-error` → `setBusy(false)`, `toast.error(detail)`.
   Husk cleanup med `removeEventListener`.

2. I `handleConnect`: pak `beginAuth()` i `try/finally` så `busy` clearer hvis `Browser.open` fejler. På native skal `busy` blive ved indtil event kommer (browseren er stadig åben), men hvis `beginAuth` selv kaster, skal vi cleared.
   - Enklere: clear `busy` i `finally` på web (window.location.href navigerer alligevel væk); på native lader vi event-listeneren clear det. Praktisk løsning: efter `await beginAuth()` resolves, sæt en safety timeout (fx 60s) der clearer `busy` hvis intet event er kommet — så brugeren ikke kan sidde fast hvis de annullerer login.

## Teknisk note

Ingen ændringer i `src/lib/spotify.ts`, `Info.plist`, eller Capacitor config — deep link-pipen virker, det er kun React-state i `MusicIntegrationSection` der ikke reagerer på den.

## Filer

- `src/components/MusicIntegrationSection.tsx` (eneste fil)
