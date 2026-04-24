## Remove glow from countdown overlay

Update `src/components/CountdownOverlay.tsx` to match the rest of the app's flat dark + neon green aesthetic.

### Changes
- **Background**: Replace `backdrop-blur-2xl bg-background/70` with solid `bg-background` so it's a clean dark surface (no blur, no translucency).
- **Number styling**: Remove the `drop-shadow-[0_0_40px_oklch(0.92_0.21_130/0.55)]` glow filter from the countdown digit. Keep the `text-neon` color, font, size, and `animate-scale-in` entrance animation intact.
- **Start Now button**: Remove `shadow-neon` so it matches the flat styling used elsewhere.

No other files affected. Behavior (countdown timing, beeps, vibration, GO speech, cancel/start buttons) is unchanged.