# Flyt Spotify-konfiguration væk fra løbeskærmen

## Mål
Få Coach/Løbe-skærmen renere ved at flytte al Spotify-opsætning (login + valg af standard-playliste) til en dedikeret sektion under Profil. Selve afspilleren på løbeskærmen reduceres til en lille, diskret widget. START-knappen starter automatisk standard-playlisten.

## Ændringer

### 1. Ny komponent: `MusicIntegrationSection` (under Profil)
Ny fil `src/components/MusicIntegrationSection.tsx` – placeres på `/profile` lige under den eksisterende `IntegrationsSection`.

Indhold:
- Titel: "Musik-integration" / "Music integration".
- Spotify-grøn (#1DB954) som accent (knapper, ikoner, "valgt"-markering, divider-glow). Implementeres som en lokal token på selve komponenten (ingen ændring af globalt design system).
- Hvis ikke logget ind: "Forbind Spotify"-knap (bruger `beginAuth`).
- Hvis logget ind:
  - Spotify-logo + kontostatus + "Frakobl"-knap.
  - "Standard-playliste for Orbit Run":
    - Viser nuværende valg (cover + navn + ejer) eller "Ingen valgt".
    - Knap "Vælg playliste" der åbner den eksisterende `SpotifyPlaylistPicker`.
    - Lille "Ryd valg"-link når noget er valgt.
  - Tydeligt label: "Denne playliste afspilles automatisk når du starter en løbetur."

### 2. Skrumpet løbeskærm-widget: `MusicHubMini`
Erstatter den fulde `MusicHub` på `/` (`src/routes/index.tsx`) og i `FocusRunView`.

Mini-widget viser kun:
- Lille artwork-thumbnail (32–40 px).
- Sangtitel + kunstner (én linje hver, truncate / marquee for titel).
- Play/Pause, Forrige, Næste – kompakte runde knapper.
- Ingen "skift playliste"-knap, ingen menu, ingen "Use this device"-række, ingen progress-bar (eller meget tynd 1 px hvis ønsket).
- Hvis ikke logget ind: lille hint "Forbind Spotify under Profil → Musik" (link til `/profile`). Ingen connect-knap her.

Den eksisterende `MusicHub` kan enten:
- Slettes til fordel for `MusicHubMini` + auto-start-logikken flyttet til en lille hook `useSpotifyRunControl()` (foretrukket), eller
- Beholdes kun internt brugt af mini-versionen.

Foretrukket: udtræk auto-start/auto-pause `useEffect` (linje 156–171 i `MusicHub.tsx`) til ny hook `src/hooks/use-spotify-run-control.ts`, der monteres én gang i `__root.tsx`. Så er logikken uafhængig af om widget'en er synlig.

### 3. Start-logik
Allerede i dag fyrer løbe-tracker eventet `orbit:run-start`, som `MusicHub` lytter på og kalder `startActivePlaylist()`. Vi flytter den lytter til den nye `useSpotifyRunControl`-hook (samme kode, samme `playContext` + device-wake), så afspilning starter selv når widget'en ikke er mountet.

Bekræftelse af "starter med det samme på iPhone": vi beholder den eksisterende `transferPlayback` + `waitForActiveDevice`-warm-up, som også flyttes til hook'en og kører så snart brugeren er authed (uafhængigt af skærm).

### 4. i18n
Tilføj nøgler i `src/lib/i18n.tsx` (en + da):
- `profile.musicIntegration` ("Music integration" / "Musik-integration")
- `profile.musicIntegrationHint` ("Connect Spotify and choose your default workout playlist." / "Forbind Spotify og vælg din standard-løbeplayliste.")
- `music.defaultPlaylist` ("Default for Orbit Run" / "Standard for Orbit Run")
- `music.willAutoPlay` ("Plays automatically when you start a run." / "Afspilles automatisk når du starter en løbetur.")
- `music.connectSpotifyInProfile` ("Connect Spotify under Profile → Music" / "Forbind Spotify under Profil → Musik")

### 5. Filer der ændres
- `src/components/MusicIntegrationSection.tsx` – ny.
- `src/components/MusicHubMini.tsx` – ny (lille afspiller).
- `src/hooks/use-spotify-run-control.ts` – ny (auto-start/-pause + warm-up).
- `src/routes/__root.tsx` – mount hook'en globalt.
- `src/routes/profile.tsx` – tilføj `<MusicIntegrationSection />`.
- `src/routes/index.tsx` – udskift `<MusicHub />` med `<MusicHubMini />`.
- `src/components/FocusRunView.tsx` – udskift `<MusicHub />` med `<MusicHubMini />`.
- `src/components/MusicHub.tsx` – slettes (logik flyttet til hook + mini).
- `src/lib/i18n.tsx` – nye nøgler.

## Spotify-grøn
Kun anvendt lokalt i `MusicIntegrationSection` (Tailwind arbitrary values: `bg-[#1DB954]`, `text-[#1DB954]`). Resten af appen beholder eksisterende neon-accent.

## Verifikation
- Profil-side viser ny "Musik-integration"-sektion med grøn accent; kan logge ind/ud og vælge playliste.
- Coach/Løbe-skærm viser kun den lille widget – ingen playliste-vælger.
- Tryk på START → standard-playliste begynder at spille på iPhone inden for ~1 s.
- Tryk på STOP → musikken pauser.
