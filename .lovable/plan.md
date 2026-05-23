Jeg vil rette to sandsynlige årsager i native iOS-flowet:

1. Spotify åbner ikke Safari
- Fjerne brugen af `App.openUrl`, fordi Capacitor `@capacitor/app` håndterer deep links, men ikke er den officielle API til at åbne eksterne URL’er i Capacitor 8.
- Tilføje `@capacitor/app-launcher` og bruge `AppLauncher.openUrl({ url: spotifyAuthUrl })` som primær native launch til system Safari/ekstern URL.
- Beholde `Browser.open` som fallback, men logge tydeligt hvis AppLauncher ikke findes eller fejler.
- Opdatere plugin-loaderen, så app-launcher bliver bundlet i iOS-buildet.

2. GPS bliver ved med at “søge”
- Der er flere uafhængige GPS-watchers: root warm-up, RunMap warm-up og run-tracker. De kan starte/stoppe hinanden og give iOS-lokationsikonet kort liv uden at opdatere chip-state.
- Gøre `use-run-tracker` til den primære kilde for chip-status og lade startskærmens `warmGps()` faktisk starte en watcher, der opdaterer `gpsAccuracyM`/`gpsReady` før løbet.
- Justere “klar”-grænsen fra meget stramme `<=20m` til samme realistiske niveau som chippen bruger (`<100m`), så UI ikke bliver hængende på “Finder signal…” selvom iPhone har en brugbar GPS-fix.
- Reducere eller koordinere RunMap’s egen GPS-opvarmning, så den ikke konkurrerer med run-trackerens native watcher.

3. Native iOS build-vejledning
- Opdatere iOS-setup-noterne/tjeklisten, så den matcher den nye AppLauncher-baserede Spotify-start og viser de forventede logs.
- Efter ændringer skal du køre `npm run build && npx cap sync ios`, og hvis der er Info.plist/native plugin ændringer: slet appen fra iPhone og installer igen fra Xcode.