## Goal
Add a **Juridisk / Legal** section at the bottom of the Profile page with two items — Privacy Policy and Terms & Disclaimer — that open as modal sheets containing the provided DA/EN content (language follows the app's current `lang`).

## Implementation

### 1. New component: `src/components/LegalSheet.tsx`
- Single reusable bottom-sheet/modal styled to match Orbit Lab dark theme (glass panel, neon accents, same look as `HealthPermissionSheet` / `CoachOnboarding`).
- Props: `open: boolean`, `onClose: () => void`, `kind: "privacy" | "terms"`.
- Renders title + numbered body. Pulls strings from `useI18n()` so it auto-switches DA/EN.
- Fixed overlay with backdrop blur, centered max-w-md card, scrollable body, close button (X icon) and a "Luk / Close" footer button.
- Safe-area-aware padding.

### 2. Profile page: `src/routes/profile.tsx`
- Add a new `<section>` directly above the `Orbit Lab · v1.0` footer, styled like the other settings sections (`glass rounded-2xl divide-y divide-border`).
- Header chip "Juridisk / Legal" (small uppercase eyebrow above the section, matching existing patterns).
- Two button rows with icons from `lucide-react`:
  - Privacy Policy — `ShieldCheck` (or `Lock`)
  - Terms & Disclaimer — `FileText` (or `ScrollText`)
- Each row sets local state `legalOpen: "privacy" | "terms" | null`.
- Render `<LegalSheet>` when state is non-null.

### 3. i18n: `src/lib/i18n.tsx`
Add keys to both `en` and `da` dictionaries:
- `legal.section` → "Legal" / "Juridisk"
- `legal.privacy.row` → "Privacy Policy" / "Privatlivspolitik"
- `legal.terms.row` → "Terms & Disclaimer" / "Vilkår & Ansvarsfraskrivelse"
- `legal.close` → "Close" / "Luk"
- `legal.privacy.title` — DA: "Privatlivspolitik for Orbit Lab" / EN: "Orbit Lab Privacy Policy"
- `legal.privacy.intro` — full intro paragraph
- `legal.privacy.1.title` … `legal.privacy.4.title` and `.body` for the 4 numbered items
- `legal.terms.title` — DA: "Vilkår og Medicinsk Ansvarsfraskrivelse" / EN: "Terms & Medical Disclaimer"
- `legal.terms.intro` — agreement intro line
- `legal.terms.1.title` … `legal.terms.3.title` and `.body` for the 3 numbered items

All copy taken verbatim from the prompt.

## Out of scope
- No routing changes (modal-only, no `/legal` routes).
- No backend, no consent tracking, no acceptance log.
- No changes to existing sections.
