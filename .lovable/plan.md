# Fix: build fejler på uens @tanstack-versioner

## Hvad der er galt

`package.json` bruger `^`-ranges for TanStack-pakkerne, og de tre direkte afhængigheder peger på tre forskellige minor-linjer:

- `@tanstack/react-router` `^1.168.0`
- `@tanstack/react-start` `^1.167.14`
- `@tanstack/router-plugin` `^1.167.10`

Ved en frisk `npm install` løser npm hver pakke uafhængigt, så de indre pakker havner på forskellige linjer. I den nuværende installation:

```text
router-core        1.168.15
react-router       1.168.21
start-client-core  1.167.17
react-start        1.167.39
start-plugin-core  1.167.34
react-start-client 1.166.38
```

Nyere start-pakker importerer `getStylesheetHref` fra `@tanstack/router-core`, men den hoistede `router-core` er fra en ældre linje uden det eksport-navn — deraf `SyntaxError: ... does not provide an export named 'getStylesheetHref'`.

## Rettelsen

1. Pin de direkte TanStack-pakker til én sammenhængende, nyeste udgivelse i `package.json` (eksakte versioner, ingen `^`):
   - `@tanstack/react-start` `1.168.34`
   - `@tanstack/react-router` `1.170.18` (den version `react-start` selv kræver)
   - `@tanstack/router-plugin` `1.168.23`
2. Tilføj `overrides` (og tilsvarende `resolutions`) der tvinger alle transitive TanStack-router/start-pakker til ét sæt versioner, så npm ikke kan hoiste en gammel `router-core` igen. De eksisterende `seroval`-overrides bevares.
3. Slet `package-lock.json` og kør `npm install` på ny, så låsefilen genskabes konsistent.
4. Verificér med `npm run build` at build går igennem uden fejl, og at dev-serveren stadig svarer.

Hvis den nyeste linje viser sig at introducere andre brud, falder jeg i stedet tilbage til at pinne hele familien til 1.167-linjen (den `react-start` allerede bruger) — samme princip, bare ældre baseline.

## Om commit til GitHub

Jeg kan ikke køre git-kommandoer. Projektet synkroniseres automatisk til dit forbundne GitHub-repo, når ændringen er gemt — så rettelsen lander i repoet uden manuelt commit fra min side.

## Filer der ændres

- `package.json` (versioner + overrides/resolutions)
- `package-lock.json` (regenereres)
