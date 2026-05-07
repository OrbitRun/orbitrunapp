## Trim coach onboarding completion text

### Changes

**`src/lib/i18n.tsx`** — update strings (both EN + DA):
- `coach.thinking.done`:
  - DA: `"Jeg har analyseret din profil.\nLad os tage en uge ad gangen."`
  - EN: `"I have analyzed your profile.\nLet's take it one week at a time."`
- `coach.thinking.goalPreview`:
  - DA: `"Jeg er nu klar til at hjælpe dig mod dit mål: {goal}."`
  - EN: `"I'm now ready to help you toward your goal: {goal}."`

**`src/components/CoachOnboarding.tsx`** (lines ~410-416):
- Remove the welcome paragraph (`{welcome}`) entirely so the personalized "Velkommen Løber! ..." sentence no longer appears. Also remove the now-unused `welcome`/`hasBody`/`weightNum`/`heightNum`/`name` locals related to it.
- Add `whitespace-pre-line` to the `coach.thinking.done` paragraph so the `\n` renders as a line break.

### Result
- "High Five! Du er klar." → kept.
- "Velkommen Løber!..." → removed.
- "Tak!" prefix removed; remaining text on two lines.
- Orbit Coach box uses `:` instead of `om`.

### Out of scope
Layout, styling, other copy, other languages/strings.
