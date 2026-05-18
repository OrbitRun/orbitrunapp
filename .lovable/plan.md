## Problem

`MusicHubFull` (musik-widget i Focus/Indoor run-view) tjekker kun `isAuthed()` ved mount. Når brugeren forbinder Spotify under en run (deep-link round-trip dispatcher `orbit:spotify-authed`), opdaterer widgetten ikke — den bliver ved med at vise "Connect Spotify in Profile" indtil komponenten remountes.

## Fix

I `src/components/MusicHubFull.tsx`:

1. Tilføj `useEffect` der lytter på `window` for:
   - `orbit:spotify-authed` → sæt `authed = isAuthed()` og kald `refresh()` med det samme så now-playing/track vises uden at vente på næste poll.
   - `orbit:spotify-auth-error` → sæt `authed = false`.
2. Ryd listeners ved unmount.

Ingen andre ændringer — poll-loopet starter automatisk via det eksisterende `useEffect([authed, refresh])` så snart `authed` flipper til true.

## Filer

- `src/components/MusicHubFull.tsx`
