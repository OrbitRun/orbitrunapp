// Mapbox public access token.
//
// Security: Mapbox `pk.*` tokens are designed to be publishable (they ship in the
// browser bundle by definition). Protect them by restricting allowed URLs in the
// Mapbox dashboard — never paste a secret `sk.*` token here.
//
// We prefer a build-time env var (VITE_MAPBOX_TOKEN) so the token can be rotated
// without a code change, and fall back to the project default for local dev.
const FALLBACK_TOKEN =
  "pk.eyJ1IjoiYm9sYW5kOTAiLCJhIjoiY21vNWtpdXNjMWtjeDJxcXcwYzJwNm1sbCJ9.-Ea_NOmHv9ls1Wjr8DHKlA";

export const MAPBOX_TOKEN: string =
  (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) || FALLBACK_TOKEN;

export const MAPBOX_STYLE = "mapbox://styles/mapbox/dark-v11";
