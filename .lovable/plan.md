## Remove glow from neon-green hero numbers

Remove the glow effect from the left hero stat values so the neon green digits render flat (no shadow/halo), matching a cleaner look.

### Change

**`src/components/EditableStat.tsx`** — In the hero value `<span>`, drop the `glow-neon` class from the `heroPosition === "left"` branch:

```tsx
heroPosition === "left"
  ? "text-neon"          // was: "text-neon glow-neon"
  : "text-foreground"
```

No other files need changes. `FocusRunView.tsx` already uses plain `text-neon` for its hero numbers without glow, so it stays as-is.