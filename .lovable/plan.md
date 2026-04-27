## Move Spotify controls below map in Focus Mode

Single edit to `src/components/FocusRunView.tsx`:

- Remove the absolute-positioned mini player overlay currently sitting in the bottom-left of the map.
- Add a new dedicated row directly beneath the map containing the same prev / play-pause / next buttons, plus the current track title and artist.
- Style the row with the existing `glass` token + `rounded-2xl` so it matches the rest of the app's color scheme.
- Map height stays as it is now; only the music controls move.
