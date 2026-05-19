## Problem

`beginAuth()` i `src/lib/spotify.ts` bruger `window.location.href = authUrl` for at sende brugeren til Spotify. I Lovable-editorens preview er appen indlejret i en iframe, og Spotify svarer med `X-Frame-Options: DENY` — derfor "This site can't be reached" før login-skærmen overhovedet vises.

På published URL åbnet i en separat fane virker det allerede. Fixet sikrer at det også virker når brugeren tester via editor-preview, uden at ændre det fungerende native (Capacitor Browser) flow.

## Ændring

Én fil: `src/lib/spotify.ts`, inde i `beginAuth()` — den eksisterende `window.location.href = authUrl` linje (slutningen af funktionen, web-grenen).

Erstat med iframe-detektion:

```ts
// Web fallback. If we're inside an iframe (Lovable editor preview),
// Spotify's auth page refuses to be framed (X-Frame-Options: DENY),
// which shows up as "This site can't be reached". Break out to the top
// window so the user lands on Spotify in the real browser tab.
try {
  if (window.top && window.top !== window.self) {
    window.top.location.href = authUrl;
    return;
  }
} catch {
  // Cross-origin top access denied — fall back to opening a new tab.
  window.open(authUrl, "_blank", "noopener");
  return;
}
window.location.href = authUrl;
```

## Hvad ændringen ikke rører

- Capacitor-grenen (`@capacitor/browser`) for iOS/TestFlight — uændret.
- Redirect URI'er, scopes, PKCE-flow, token-exchange — uændret.
- `/spotify/callback` route — uændret.

## TestFlight-sporet

"This site can't be reached" i TestFlight er en separat sag (custom URL scheme handoff). Vi parkerer den indtil web er bekræftet grøn, da du selv skrev at i-app Spotify-flowet historisk aldrig har virket i TestFlight. Når web er ok, åbner vi det som næste skridt.

## Verifikation efter implementation

1. I editor-preview: tryk Connect → Spotify-loginskærm åbner i top-fanen (eller ny fane).
2. Log ind → redirect til `/spotify/callback` → tilbage til `/` autentificeret.
3. Published URL: uændret, virker fortsat.
