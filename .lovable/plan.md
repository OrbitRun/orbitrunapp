# Optimer live-kortet med øjeblikkelig position + pulserende neongrøn prik

## Mål
Når brugeren åbner forsiden, skal kortet straks centrere på deres aktuelle GPS-position og vise en pulserende neongrøn "User Location"-prik — uden at de skal trykke Start. Det varmer GPS'en op, så ruten starter præcist.

## Ændringer

### 1. `src/components/RunMap.tsx` — selvstændig user-location warm-up
- Tilføj en intern `useEffect`, der starter en let GPS-watch når komponenten mounter (kun når `interactive` og ingen `points` endnu — dvs. før løb).
  - Brug `nativeWatchPosition` hvis Capacitor er tilgængeligt, ellers `navigator.geolocation.watchPosition` med `enableHighAccuracy: true`.
  - Kald også `getCurrentPosition` for et hurtigt første fix.
  - Ryd watch i cleanup og når `points.length > 0` (så `useRunTracker` overtager uden dobbelt GPS-stream).
- Render en pulserende neongrøn Mapbox-marker på den seneste user-position (custom DOM marker):
  - kerne: 14px solid neon (`#C6F432`) med mørk 2px border + svag neon glow
  - halo: neon med `opacity 0.35` + `animation: user-loc-pulse 1.6s ease-out infinite`
- Første gang vi får et user-fix (og ingen `points` endnu): `map.easeTo({ center, zoom: 16, duration: 600 })`.
- `follow`-prop er allerede `true` som default. Udvid follow-logikken så kortet også følger user-prikken før løb (når `points.length === 0` og `userMoved === false`).
- Skjul/fjern marker så snart `points.length > 0` (run startet — eksisterende neon head-marker tager over).

### 2. `src/styles.css` — keyframes for puls
```css
@keyframes user-loc-pulse {
  0%   { transform: scale(0.6); opacity: 0.6; }
  100% { transform: scale(2.4); opacity: 0; }
}
```

### 3. `src/routes/index.tsx` — ingen ændringer
`t.warmGps()` og `RunMap` props er allerede korrekte.

## Edge cases
- SSR: alt GPS-arbejde sker i `useEffect` (klient-only).
- Permission denied: fejl sluges stille; placeholder-overlay vises som før.
- Run start: cleanup-watch og fjern marker for at undgå konflikt med tracker.
- iOS native: bruger `kCLLocationAccuracyBestForNavigation` via eksisterende helper.

## Verifikation
- Åbn `/` → kortet centrerer på din position, neon prik pulserer.
- Tryk Start → prik forsvinder, neon-rute starter med det samme.
- Pan manuelt → recenter-knap og follow-logik uændret.
