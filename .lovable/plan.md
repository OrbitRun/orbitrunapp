## Orbit Coach Info Modal

Add an interactive info modal that explains what Orbit Coach AI does, with a CTA that scrolls the user to the audio + haptic settings.

### New component: `src/components/CoachInfoModal.tsx`

A centered modal with the existing dark glass + neon accent styling:

- Backdrop: fixed inset-0, `bg-background/80 backdrop-blur-sm`, fade-in, click-to-close.
- Card: `glass rounded-2xl` with neon border accent, max-w-sm, `animate-scale-in` (already in tailwind config).
- Header: small "Orbit Coach AI" eyebrow + title row with a close (×) button.
- Intro paragraph (DA/EN via i18n).
- Three bullet rows with neon-accent dot icons (Activity / Wind / Volume2 from lucide-react):
  - Biometric Guidance — pace adjusts to heart rate
  - Environmental Analysis — wind & temperature
  - Smart Feedback — voice cues toward PR
- Primary CTA button "Gå til opsætning" / "Go to setup" — neon background, full-width, calls `onNavigateToSettings()` then closes.
- Body-scroll lock while open (same pattern used by `LegalSheet`).
- ESC key closes. `role="dialog" aria-modal="true"`.

### `src/routes/profile.tsx` changes

1. Import the new `CoachInfoModal` and an `Info` icon from lucide-react.
2. Add state: `const [coachInfoOpen, setCoachInfoOpen] = useState(false);`
3. Add a ref for the audio/haptic settings section: `const audioSectionRef = useRef<HTMLElement>(null);` and attach it to the existing `<section>` that holds the audio/PR/auto-pause/flight-recorder/haptic/wind rows.
4. In the "Orbit Coach" section header row (the one rendering `{t("coach.enable")}`), restructure the label so the chevron-style info icon sits next to the text, mirroring how the Flight Recorder chevron works:
   - Wrap the label in a small flex container.
   - Add a button `<Info />` with `e.stopPropagation()` so it does NOT toggle coach on/off — it only opens the modal.
   - Keep the row's existing toggle behavior intact.
5. Render `<CoachInfoModal open={coachInfoOpen} onClose={...} onNavigateToSettings={...} />` near the bottom of the page (next to the other modals).
6. `onNavigateToSettings` callback: closes the modal, then `audioSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })` after a `requestAnimationFrame` to ensure the close animation doesn't interfere.

### `src/lib/i18n.tsx` — new keys (DA + EN)

Added near the existing `coach.*` group:

- `coach.info.title` — "Orbit Coach AI"
- `coach.info.intro` — DA: "Din personlige AI-strateg, der optimerer dit løb baseret på puls, vejr og mål." / EN: "Your personal AI strategist that optimizes your run based on heart rate, weather, and goals."
- `coach.info.bullet1.title` / `.body` — Biometrisk Guidance / Justerer dit tempo efter din hjerterytme.
- `coach.info.bullet2.title` / `.body` — Miljø-analyse / Tager højde for vind og temperatur.
- `coach.info.bullet3.title` / `.body` — Smart Feedback / Stemmesignaler der guider dig mod din PR.
- `coach.info.cta` — "Gå til opsætning" / "Go to setup"
- `coach.info.close` — "Luk" / "Close"

### Why scroll-to-section instead of a sub-page

The existing settings (audio cues, haptic feedback, PR voice) live in the same profile page section — scrolling there is faster and avoids creating a separate route that would duplicate controls. The CTA target is the settings section that already contains those rows.

### Animation

Uses the existing `animate-scale-in` keyframe (already in the project's tailwind config) for the modal card; backdrop uses `animate-fade-in`. No new keyframes required.

### Files

- **New**: `src/components/CoachInfoModal.tsx`
- **Edit**: `src/routes/profile.tsx` (info icon, modal mount, scroll ref + handler)
- **Edit**: `src/lib/i18n.tsx` (DA + EN keys)
