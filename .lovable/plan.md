

## Sikker bund-padding for iOS gestures

Bottom-nav'en bruger allerede `pb-[env(safe-area-inset-bottom)]` på `<nav>`, men på iOS-enheder med home-indikator (iPhone X og nyere) lægger gesture-zonen sig stadig tæt på pillen, fordi `pb-3` på den indre container kun giver 12px under nav-linkene. Vi sikrer ordentlig clearance.

### Ændringer

**`src/components/BottomNav.tsx`**
- Skift den ydre `<nav>` fra `pb-[env(safe-area-inset-bottom)]` til `pb-[max(env(safe-area-inset-bottom),12px)]`, så vi altid har minimum 12px afstand til skærmkanten — også på enheder uden safe-area-inset (Android, ældre iPhones).
- Sørg for at `pointer-events` på `<nav>` ikke fanger touches i safe-area-zonen: tilføj `pointer-events-none` på `<nav>` og `pointer-events-auto` på pillen, så swipes/gestures i hjemmeknap-området ikke blokeres af nav-containeren.
- Behold `pb-3` på den indre container for visuel åndelig plads inde i pillen.

**`src/routes/__root.tsx`** (verificeres — kun hvis nødvendigt)
- Tjek at `<main>`-indholdet på de tre sider har bundpadding der matcher nav-højden + safe-area, så indhold ikke gemmer sig under pillen. Hvis ikke allerede tilfældet, tilføjes `pb-[calc(env(safe-area-inset-bottom)+96px)]` på siderne.

### Resultat

```text
┌─────────────────────────┐
│        Page content     │
│                         │
│  ┌───────────────────┐  │  ← 16px margin (mx-4)
│  │ 🏃  📊  👤        │  │  ← Pill (pointer-events-auto)
│  └───────────────────┘  │
│  ↕ max(safe-area, 12px) │  ← Clearance over home indicator
└─────────────────────────┘
   ↕ iOS gesture zone (~34px) — nu fri for touch-fangst
```

### Filer

- Redigeret: `src/components/BottomNav.tsx`
- Verificeret/evt. redigeret: `src/routes/index.tsx`, `src/routes/history.tsx`, `src/routes/profile.tsx` (kun hvis bund-padding mangler)

