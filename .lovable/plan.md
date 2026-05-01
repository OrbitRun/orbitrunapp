## Rebrand "Orbit Lab" → "Orbit Run"

Replace every user-visible occurrence of the brand name "Orbit Lab" / "ORBIT LAB" with "Orbit Run" / "ORBIT RUN". Stand-alone uses of "Orbit" (e.g. "Orbit Coach", "Orbit Fitness Score", "Orbit reads your heart rate…") and code identifiers like `OrbitSpinner` are left untouched — only the two-word brand changes.

### Files to update

**Manifest & SEO**
- `public/manifest.webmanifest` — `"name": "ORBIT LAB"` → `"ORBIT RUN"`
- `src/routes/__root.tsx` — 6 occurrences of `ORBIT LAB` in title / og / twitter / description meta

**App copy (English + Danish strings)**
- `src/lib/i18n.tsx`:
  - EN: `app.brand`, `onb.title`, `hr.export.subtitle`, `flightRecorder.info.on` body, `legal.privacy.title`, `legal.privacy.intro`, `legal.terms.intro`, `legal.terms.medical`, `legal.terms.safety`
  - DA: `app.brand`, `onb.title`, `hr.export.subtitle`, `flightRecorder.info.on` body, `legal.privacy.title`, `legal.privacy.intro`, `legal.terms.intro`, `legal.terms.medical`, `legal.terms.safety`

**UI components / routes**
- `src/components/CoachInfoModal.tsx` line 61 — "Orbit Lab" badge text
- `src/routes/profile.tsx` line 107 (`Orbit Lab · Runner` eyebrow) and line 391 (`Orbit Lab · v1.0` footer)
- `src/routes/profile_.heart-rate.tsx` line 22 — page title `Heart Rate Zones — Orbit Lab`
- `src/lib/share-card-v2.ts` line 309 — share text "Fresh run from Orbit Lab" / "Friskt løb fra Orbit Lab"

**Code comments (non-visible, included for consistency)**
- `src/components/RunMap.tsx` line 28 — comment "Orbit Lab aesthetic"

### Left unchanged
- `OrbitSpinner` component name and imports
- "Orbit Coach", "Orbit Coach AI", "Orbit Fitness Score" — these are sub-product names, not the parent brand
- "Orbit reads your heart rate…" copy in `HealthPermissionSheet.tsx` and `docs/IOS_SETUP.md` — uses "Orbit" alone as the app's short name, still valid
- `SensorsSection.tsx` "Open in Orbit app" — uses short name only

### Notes
- No database, route, or asset path changes — purely string replacements.
- Casing is preserved per occurrence: `ORBIT LAB` → `ORBIT RUN`, `Orbit Lab` → `Orbit Run`.
- Published URL stays `orbit-lab-running.lovable.app` (URL slug, not user-visible brand text).