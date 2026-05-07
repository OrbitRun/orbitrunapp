## Add in-card header to General Settings + move Legal header in-card

Match the Sensors / Integrations pattern (small uppercase muted label as the first row inside the `glass rounded-2xl` card).

### Changes

**`src/routes/profile.tsx`**
- General settings section (currently starts at line 289, the unlabeled `glass rounded-2xl divide-y divide-border` containing audio cues, PR voice, countdown, auto-pause, flight recorder, haptic, wind unit, GPS, language): prepend an in-card header row:
  ```
  <div className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
    {t("profile.section.general")}
  </div>
  ```
- Legal section (lines 374–399): remove the floating `<div className="mt-6 mb-2 px-1 ...">{t("legal.section")}</div>`, add `mt-6` to the `<section>`, and prepend the same in-card header row using `t("legal.section")`.

**`src/lib/i18n.tsx`**
- Add new key `profile.section.general`:
  - EN: `"General"`
  - DA: `"Generelt"`

### Out of scope
- No row reorganization or behavior changes.
- Existing `legal.section` translation is reused as-is.
