# Bottom spacing final check

## What I measured (live, 393x852 and 430x932)

- Actual BottomNav pill height: **73px** (not 68px).
- Nav block total: 73px pill + 8px gap + bottom safe area.
- Shell reserved bottom space: `68 + 0 + 8 = 76px` in the browser (no safe area on desktop Chromium).
- Result: the reserve is **5px too small**. The "START LØB" button's bottom edge lands at 776px while the nav starts at 771px — a 5px overlap on both viewports.

Everything else checks out:
- No double-counting: safe-area-inset-bottom is applied once in the shell padding and once as the nav's own offset (the nav is `position: fixed`, outside shell flow), which is correct.
- Shell `scrollHeight === clientHeight` on both viewports — no extra scroll, no black strip below the nav.
- Scrollbar is hidden (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) with scrolling preserved.

## The one change needed

In `src/styles.css`, update the token to match the real pill height:

```
--orbit-nav-h: 73px;
```

This makes reserved bottom space = actual nav height (73) + bottom safe area + 8px, so START LØB clears the nav on every viewport.

No other files change.
