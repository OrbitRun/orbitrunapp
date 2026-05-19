## Problem (bekræftet)

Jeg navigerede direkte til både `https://orbitrunapp.lovable.app/spotify/callback` og `https://orbitrunapp.lovable.app/coach` på din published URL. Begge returnerer en bar `Not Found`-tekst (Cloudflare edge 404), ikke vores TanStack `NotFoundComponent` med design.

Det betyder: **din nuværende published build er forældet**. Den blev publiceret før `/spotify/callback`-ruten (og andre nyere ruter) eksisterede. Når Spotify accepterer auth og sender brugeren tilbage til `/spotify/callback`, rammer requesten en edge der ikke kender ruten → "Not Found" øverst i din egen browserfane.

I preview ser du samme symptom fordi `getRedirectUri()` bygges fra `window.location.origin`. Hvis du startede flowet i preview, går callback tilbage til preview-URL'en — som *har* ruten — men hvis du af en eller anden grund startede på published (eller redirect URI'en i Spotify-dashboard er forskellig fra hvor du står), lander du på den forældede prod.

## Hvad du skal gøre — ingen kode-ændringer

1. Tryk **Publish → Update** i Lovable-editoren. Det skubber den nuværende build (inkl. `/spotify/callback`-ruten) op på `orbitrunapp.lovable.app`.
2. Verificér ved at åbne `https://orbitrunapp.lovable.app/spotify/callback` direkte i en ny fane. Det skal nu vise "Connecting Spotify…" eller en fejl — IKKE rå "Not Found".
3. Test Connect-flowet igen — både i preview og på den nye published URL.

## Hvad der ikke behøver ændres

- `src/lib/spotify.ts` — flowet er korrekt, iframe-fixet fra sidste tur står ved magt.
- `src/routes/spotify.callback.tsx` — ruten findes, er registreret i `routeTree.gen.ts`, og virker i preview.
- Redirect URIs i Spotify Dashboard — alle 3 er stadig korrekte ifølge dig.
- Client ID — virker, vi har set Spotify acceptere auth og sende `?code=...` tilbage.

## Hvis det stadig fejler efter re-publish

Mest sandsynlige opfølgning er at `orbit:spotify-auth-error`-toast viser "Missing PKCE verifier", fordi `verifier`-værdien blev gemt på preview-origin men slået op på published-origin (forskellige `localStorage`-buckets). Det fixer vi separat ved at undgå krydsorigin-flow — men der skal vi ikke hen før re-publish er testet.
