Problemet ser nu anderledes ud end før: screenshot’et viser, at iOS-plugin installationen faktisk virker. Det vil sige, at vi ikke længere skal jage “plugin missing” — vi skal rette app-flowet ovenpå de native plugins.

Plan:

1. Fix GPS/status på løbeskærmen
- Stop med at vise en evig “søger efter GPS”-tilstand, når iOS allerede har et GPS-fix.
- Gør `SourceSignalChip` status-baseret, så den kan vise “GPS klar ±8m” i stedet for kun “GPS”.
- Sørg for at warmup-fix fra kortet/tracker faktisk sætter `gpsReady`, så startskærmen og løbekortet afspejler det GPS-fix som diagnostikken allerede beviser findes.
- Løsn første-punkt gating en smule, så ruten begynder at tegne straks ved første brugbare fix i stedet for at vente på en perfekt sekvens.

2. Fix Spotify OAuth-start
- Skift native Spotify-login fra `Browser.open()` tilbage til systemåbning med `App.openUrl()` som primær metode.
- Grunden: Capacitor Browser bruger iOS `SFSafariViewController`, og den er kendt for at være upålidelig til OAuth deep-link callbacks; system Safari/app-open flow er mere korrekt til custom URL scheme.
- Behold Browser kun som fallback, ikke som førstevalg.
- Tilføj konkret fejlvisning hvis auth URL ikke kan åbnes, så knappen ikke hænger på “Forbinder…”.

3. Gør Spotify deep-link flow mere robust
- Initialisér deep-link listeneren før loginforsøget, så callback ikke kan komme før listeneren er klar.
- Log og håndtér både `appUrlOpen` og launch URL mere tydeligt.
- Ryd spinneren deterministisk, hvis appen kommer tilbage uden token.

4. Fjern/afgræns diagnostics-panelet bagefter
- Når fixes er på plads, kan diagnostics enten skjules bag en lille debug-knap eller fjernes fra Profil, så brugeren ikke ser teknisk test-UI i produktet.

Tekniske filer der berøres:
- `src/lib/spotify.ts`
- `src/components/MusicIntegrationSection.tsx`
- `src/hooks/use-run-tracker.ts`
- `src/components/SourceSignalChip.tsx`
- evt. `src/routes/index.tsx` / `src/components/RunMap.tsx` for korrekt GPS-ready visning

Efter implementering skal der laves en ny TestFlight build med `npm run build` og `npx cap sync ios`, fordi Spotify/GPS ændringerne rammer native wrapper-flowet.