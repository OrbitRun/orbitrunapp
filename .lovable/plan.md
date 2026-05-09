## Fjern placeholder-boks på live-kortet

I `src/routes/index.tsx` fjernes overlay-blokken der viser "Tryk Start for at begynde sporing":

```tsx
{t.points.length === 0 && (
  <div className="absolute inset-0 grid place-items-center pointer-events-none">
    <div className="glass-strong rounded-2xl px-4 py-2 text-xs text-muted-foreground">
      {t.permissionError ?? tr("map.placeholder")}
    </div>
  </div>
)}
```

Hvis `t.permissionError` er sat (GPS afvist), vises den i stedet via samme overlay — bevares som lille chip øverst, eller fjernes helt?

## Spørgsmål
Skal vi stadig vise en fejlbesked, hvis brugeren afviser GPS-tilladelse? Eller helt skjule overlayet?
