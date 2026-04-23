

## Skjul scrollbaren på højre side

Brugeren vil fjerne den synlige scrollbar i højre side af appen. Scroll-funktionaliteten bevares — kun den visuelle scrollbar skjules (som de fleste mobilapps).

### Implementering

Tilføj en global CSS-regel i `src/styles.css` der skjuler scrollbaren på tværs af browsere, mens scroll fortsat fungerer:

```css
/* Hide scrollbars globally (scrolling still works) */
html, body {
  scrollbar-width: none;        /* Firefox */
  -ms-overflow-style: none;     /* IE/Edge legacy */
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;                /* Chrome/Safari/WebKit */
}
```

Den eksisterende `.no-scrollbar`-utility forbliver uændret til lokale brug (fx horisontale lister).

### Filer

- Redigeret: `src/styles.css`

