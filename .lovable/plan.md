## Add "Delete all data" feature

Let users wipe all locally-stored app data (runs, PRs, profile, coach, shoes, integrations, settings) from the profile page.

### Where it lives

`src/routes/profile.tsx` — add a new **Danger zone** section as the last card on the page (below Legal), matching the in-card header pattern (`profile.section.dangerZone`). Inside the card:
- A single destructive row: label `profile.deleteAll.title` + helper `profile.deleteAll.description`, with a red "Delete all data" button on the right.

### Behavior

- Clicking the button opens an `AlertDialog` (shadcn) confirming the action is irreversible.
- On confirm: call a new helper `wipeAllAppData()` from `src/lib/wipe-data.ts` that:
  1. Iterates `localStorage` and removes every key starting with `orbit:` or `lux-runner:` (covers all 28 keys in use — runs, PRs, profile, coach progress, shoes, HR zones, zone pacing, ghost, vitals, language, env, flight recorder, BLE/BT last device, stat layout, etc.).
  2. Dispatches the existing update events (`orbit:profile-update`, `orbit:shoes-updated`, `orbit:run-updated`, `orbit:vitals-update`, `orbit:hr-zones-update`, `orbit:zone-pacing-update`) so any listening components reset.
  3. Calls `window.location.assign("/")` to force a clean reload — onboarding will re-trigger because the profile is gone.
- Show a toast (`sonner`) "All data deleted" before reload.

### Out of scope

- No server-side data (the app is local-only; Lovable Cloud is enabled but no user tables exist yet).
- No selective deletion (runs only, profile only, etc.) — single "delete everything" action.
- No export-before-delete flow.

### i18n keys to add in `src/lib/i18n.tsx`

| Key | EN | DA |
|---|---|---|
| `profile.section.dangerZone` | "Danger zone" | "Farezone" |
| `profile.deleteAll.title` | "Delete all data" | "Slet alle data" |
| `profile.deleteAll.description` | "Permanently remove runs, profile, and settings from this device." | "Fjern løb, profil og indstillinger permanent fra denne enhed." |
| `profile.deleteAll.confirmTitle` | "Delete all data?" | "Slet alle data?" |
| `profile.deleteAll.confirmBody` | "This will erase every run, personal record, shoe, and setting stored on this device. This cannot be undone." | "Dette sletter alle løb, rekorder, sko og indstillinger på denne enhed. Det kan ikke fortrydes." |
| `profile.deleteAll.cancel` | "Cancel" | "Annuller" |
| `profile.deleteAll.confirm` | "Delete everything" | "Slet alt" |
| `profile.deleteAll.toast` | "All data deleted" | "Alle data slettet" |
