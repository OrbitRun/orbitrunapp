// Public Mapbox access token (safe to expose in client per Mapbox docs).
// Restrict by URL in your Mapbox dashboard for production.
export const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm9sYW5kOTAiLCJhIjoiY21vdWM2MXJ0MGQ5aTJ0c2hyNTRob3NsciJ9.BPZe1AjKa3JWKvwys3kUzQ";

// Use an explicit HTTPS style URL instead of `mapbox://styles/...` so iOS
// WKWebView never has to resolve a custom scheme — every Mapbox request
// becomes a plain HTTPS GET that flows through the CapacitorHttp bridge
// (see capacitor.config.ts → plugins.CapacitorHttp.enabled).
export const MAPBOX_STYLE =
  `https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=${MAPBOX_TOKEN}`;

/**
 * mapbox-gl `transformRequest` callback: rewrites any incidental http:// URL
 * to https:// so iOS' App Transport Security doesn't drop the request, and
 * passes the URL/headers through unchanged otherwise. Mapbox GL's internal
 * fetch / XHR is already patched by CapacitorHttp on native iOS.
 */
export function mapboxTransformRequest(url: string): { url: string } {
  if (/^http:\/\//i.test(url)) return { url: url.replace(/^http:\/\//i, "https://") };
  return { url };
}
