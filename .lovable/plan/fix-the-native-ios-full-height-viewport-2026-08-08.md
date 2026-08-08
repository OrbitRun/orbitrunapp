# Fix the native iOS full-height viewport

## Confirmed cause

The rendered web hierarchy does not contain a `#root` wrapper: `#orbit-shell` is a direct child of `body`. Browser measurements confirm that `html`, `body`, and `#orbit-shell` already occupy the full CSS viewport, and no ancestor of `BottomNav` has a transform, containment, or positioning context that changes its fixed anchoring.

The conflicting property is `ios.contentInset: "always"` in `capacitor.config.ts`. It asks iOS to inset the WKWebView content area while the app also uses `viewport-fit=cover` and CSS `env(safe-area-inset-*)`. Consequently, the web shell and `position: fixed; bottom: 0` can only reach the bottom of the already-inset web viewport, leaving the native black area outside it. The user approved changing this setting despite the original “do not touch Capacitor configuration” constraint.

## Smallest global fix

1. In `capacitor.config.ts`, change only:

```diff
 ios: {
-  contentInset: "always",
+  contentInset: "never",
   scrollEnabled: true,
 },
```

2. Keep the existing global CSS model unchanged unless runtime verification exposes a separate measurable defect:
   - `html` and `body` remain full-height and non-scrolling.
   - `#orbit-shell` remains the single `100dvh` scroll container with edge-to-edge background.
   - Top safe-area padding remains owned by `#orbit-shell` exactly once.
   - BottomNav remains visually unchanged and fixed at `bottom: 0`, with `env(safe-area-inset-bottom) + 8px` applied exactly once.
   - Shell bottom reservation remains actual nav height + bottom safe area + 8px.

No arbitrary margins, page offsets, extra `pb-*`, JavaScript scroll handling, or route-specific viewport fixes will be added.

## Verification

- Verify the computed hierarchy and bounding rectangles on iPhone-sized short and tall viewports: `html`, `body`, and `#orbit-shell` must end at the viewport bottom. Since TanStack renders no `#root`, explicitly report that fact rather than inventing a missing wrapper.
- Check Run, History, Profile, and Coach: short content fills the viewport; long content scrolls in the shell; BottomNav remains at the physical bottom; no black strip or visible scrollbar appears.
- Confirm `BottomNav` has no transformed/contained ancestor and is not visually redesigned.
- Report `git diff --name-only`, grouped by the single native-web viewport configuration change and any CSS change (expected: none).
- Show the exact final diff before publishing.

Untouched: GPS/tracking, native iOS project files, onboarding keyboard behavior, dialogs/sheets, run calculations, and page-specific layouts.