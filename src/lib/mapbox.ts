// Mapbox public access token.
//
// Security: Mapbox `pk.*` tokens are designed to be publishable (they ship in
// the browser bundle by definition). Protect them by restricting allowed URLs
// in the Mapbox dashboard — never paste a secret `sk.*` token here.
//
// The token is loaded from VITE_MAPBOX_TOKEN at build time so it can be
// rotated without a code change. If missing, map features degrade gracefully
// and a warning is logged in development.
export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "";

if (!MAPBOX_TOKEN && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    "[mapbox] VITE_MAPBOX_TOKEN is not set. Map features will be disabled. " +
      "Add it as a build env var to enable maps.",
  );
}

export const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";
