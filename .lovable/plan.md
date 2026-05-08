## Change

Replace the large round Start button on the run page (`src/routes/index.tsx`, the idle/finished state inside the bottom controls section, ~lines 427–438) with a slim full-width pill button styled like the "Vis dagens pas" CTA in `CoachCard.tsx`:

```
className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
           bg-neon/10 border border-neon/30 text-neon text-xs font-black
           uppercase tracking-[0.15em] hover:bg-neon/15 active:scale-[0.98] transition"
```

- Icon: `Play` (h-3.5 w-3.5), label from i18n key.
- Keeps existing `beginCountdown` handler.
- Drops the absolute-positioned label underneath (no longer needed on a pill).
- Pause / Resume / Stop buttons (running state) stay unchanged.

### i18n
Add new key `ctrl.start.run`:
- en: "Start run"
- da: "Start løb"

(Keep existing `ctrl.start` since it's used as `aria-label` elsewhere; the new pill uses the new key for its visible label and `aria-label`.)

### Verification
On `/` in idle state, the bottom shows a slim neon-outline pill "START LØB" / "START RUN" matching the Coach CTA. Tapping it still triggers the countdown → run start flow.
