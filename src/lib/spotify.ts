// Spotify Web API client with PKCE OAuth (no backend, no client secret).
// Replace SPOTIFY_CLIENT_ID with your own Client ID from
// https://developer.spotify.com/dashboard

// Public Spotify Client ID. The Client ID is publishable (PKCE flow, no client secret).
export const SPOTIFY_CLIENT_ID: string =
  (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined) ??
  "60749f03c1184bc6905c571975d97208";

export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

const TOKEN_KEY = "pulse.spotify.token";
const VERIFIER_KEY = "pulse.spotify.verifier";
const PLAYLIST_KEY = "pulse.spotify.active_workout_playlist";

export type ActiveWorkoutPlaylist = {
  uri: string;
  name: string;
  imageUrl: string | null;
};

export function getActiveWorkoutPlaylist(): ActiveWorkoutPlaylist | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkoutPlaylist) : null;
  } catch {
    return null;
  }
}

export function setActiveWorkoutPlaylist(p: ActiveWorkoutPlaylist | null) {
  if (typeof window === "undefined") return;
  if (!p) localStorage.removeItem(PLAYLIST_KEY);
  else localStorage.setItem(PLAYLIST_KEY, JSON.stringify(p));
}

export function hasPlaylistScope(): boolean {
  const tok = getStoredToken();
  return !!tok?.scope?.includes("playlist-read-private");
}

export type SpotifyToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
  token_type: string;
  scope: string;
};

// Custom URL scheme used inside the Capacitor iOS shell. Must match the
// CFBundleURLTypes entry in ios/App/App/Info.plist AND the Redirect URI
// registered in the Spotify Developer Dashboard.
export const NATIVE_REDIRECT_URI = "jonas-orbit-run://callback";

function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
      platform?: string;
    };
  };
  const cap = w.Capacitor;
  if (!cap) return false;
  if (typeof cap.isNativePlatform === "function" && cap.isNativePlatform()) return true;
  const p = (typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform) ?? "";
  return p === "ios" || p === "android";
}

export function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  if (isCapacitorNative()) return NATIVE_REDIRECT_URI;
  return `${window.location.origin}/spotify/callback`;
}

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
}

function randomString(len = 64): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64url(bytes).slice(0, len);
}

export function getStoredToken(): SpotifyToken | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SpotifyToken;
  } catch {
    return null;
  }
}

export function setStoredToken(t: SpotifyToken | null) {
  if (typeof window === "undefined") return;
  if (!t) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
}

export function isConfigured(): boolean {
  const id: string = SPOTIFY_CLIENT_ID;
  return id !== "REPLACE_WITH_YOUR_SPOTIFY_CLIENT_ID" && id.length > 0;
}

export async function beginAuth(): Promise<void> {
  if (!isConfigured()) throw new Error("Spotify Client ID not configured");
  const verifier = randomString(96);
  const challenge = base64url(await sha256(verifier));
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
  });
  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
  const native = isCapacitorNative();
  // Diagnostic: visible in Xcode console. Confirms which redirect_uri Spotify
  // sees. If this prints the https URL on a device, the native detection is
  // failing and Spotify will redirect SFSafariViewController to the web page.
  // eslint-disable-next-line no-console
  console.log("[spotify] beginAuth", { native, redirect_uri: getRedirectUri() });
  if (native) {
    // Open the Spotify auth page in an in-app browser. The user logs in,
    // Spotify redirects to jonas-orbit-run://callback, iOS routes that
    // back into the app via `appUrlOpen` (see initSpotifyDeepLinkListener).
    try {
      const specifier = "@capacitor/browser";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await (Function(
        "s",
        "return import(s)",
      ) as (s: string) => Promise<unknown>)(specifier);
      const Browser = mod?.Browser ?? mod?.default?.Browser ?? mod?.default;
      if (Browser?.open) {
        await Browser.open({ url: authUrl, presentationStyle: "popover" });
        return;
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[spotify] @capacitor/browser unavailable, falling back", e);
    }
  }
  window.location.href = authUrl;
}

/**
 * Capacitor-only: listen for the Spotify OAuth redirect that comes back via
 * the custom URL scheme (jonas-orbit-run://callback?code=...). Exchanges
 * the code for a token, closes the in-app browser, and dispatches
 * `orbit:spotify-authed`. No-op on web (the /spotify/callback route handles it).
 *
 * Returns a teardown function.
 */
export function initSpotifyDeepLinkListener(): () => void {
  if (!isCapacitorNative()) return () => {};
  let removeListener: (() => void) | null = null;
  let cancelled = false;

  // Extract `code` (or `error`) from a jonas-orbit-run:// URL. Handles
  // searchParams, fragment, and a regex fallback (older iOS sometimes drops
  // the query when `new URL()` parses a custom scheme).
  const parseCallback = (url: string): { code?: string; error?: string } => {
    try {
      const parsed = new URL(url);
      const frag = new URLSearchParams(
        parsed.hash.startsWith("#") ? parsed.hash.slice(1) : parsed.hash,
      );
      const code = parsed.searchParams.get("code") ?? frag.get("code") ?? undefined;
      const error = parsed.searchParams.get("error") ?? frag.get("error") ?? undefined;
      if (code || error) return { code: code ?? undefined, error: error ?? undefined };
    } catch {
      /* fall through to regex */
    }
    const m = url.match(/[?&#]code=([^&]+)/);
    const e = url.match(/[?&#]error=([^&]+)/);
    return {
      code: m ? decodeURIComponent(m[1]) : undefined,
      error: e ? decodeURIComponent(e[1]) : undefined,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUrl = async (url: string, Browser: any) => {
    if (!url || !url.toLowerCase().startsWith("jonas-orbit-run://")) return;
    // eslint-disable-next-line no-console
    console.log("[spotify] deep link received", url);
    const { code, error } = parseCallback(url);
    if (Browser?.close) {
      try { await Browser.close(); } catch { /* noop */ }
    }
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[spotify] auth error", error);
      window.dispatchEvent(new CustomEvent("orbit:spotify-auth-error", { detail: error }));
      return;
    }
    if (!code) {
      // eslint-disable-next-line no-console
      console.warn("[spotify] no code in callback URL");
      return;
    }
    try {
      await exchangeCode(code);
      // eslint-disable-next-line no-console
      console.log("[spotify] token exchange OK");
      window.dispatchEvent(new CustomEvent("orbit:spotify-authed"));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[spotify] token exchange failed", err);
      window.dispatchEvent(
        new CustomEvent("orbit:spotify-auth-error", {
          detail: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  };

  (async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dynImport = Function("s", "return import(s)") as (s: string) => Promise<unknown>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const appMod: any = await dynImport("@capacitor/app");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const browserMod: any = await dynImport("@capacitor/browser").catch(() => null);
      const App = appMod?.App ?? appMod?.default?.App ?? appMod?.default;
      const Browser = browserMod?.Browser ?? browserMod?.default?.Browser ?? browserMod?.default;
      if (!App?.addListener || cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle: any = await App.addListener(
        "appUrlOpen",
        (event: { url: string }) => { void handleUrl(event?.url ?? "", Browser); },
      );
      removeListener = () => {
        try { handle?.remove?.(); } catch { /* noop */ }
      };
      // Cold-start case: if iOS launched the app *because* of the URL, the
      // appUrlOpen event fired before this listener registered. Replay it.
      if (typeof App.getLaunchUrl === "function") {
        try {
          const launch = await App.getLaunchUrl();
          if (launch?.url) void handleUrl(launch.url, Browser);
        } catch { /* noop */ }
      }
    } catch {
      /* native plugin not available — silently no-op */
    }
  })();
  return () => {
    cancelled = true;
    removeListener?.();
  };
}

export async function exchangeCode(code: string): Promise<SpotifyToken> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier");
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error_description || j?.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(
      `Spotify token exchange failed (${res.status})${detail ? `: ${detail}` : ""}. ` +
        `Check that "${getRedirectUri()}" is added as a Redirect URI in the Spotify Developer Dashboard.`,
    );
  }
  const data = await res.json();
  const tok: SpotifyToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };
  setStoredToken(tok);
  sessionStorage.removeItem(VERIFIER_KEY);
  return tok;
}

async function refreshToken(): Promise<SpotifyToken | null> {
  const cur = getStoredToken();
  if (!cur?.refresh_token) return null;
  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: cur.refresh_token,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    setStoredToken(null);
    return null;
  }
  const data = await res.json();
  const tok: SpotifyToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? cur.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };
  setStoredToken(tok);
  return tok;
}

async function getValidToken(): Promise<string | null> {
  let tok = getStoredToken();
  if (!tok) return null;
  if (Date.now() > tok.expires_at - 30_000) {
    tok = await refreshToken();
  }
  return tok?.access_token ?? null;
}

export function logout() {
  setStoredToken(null);
}

export function isAuthed(): boolean {
  return !!getStoredToken();
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidToken();
  if (!token) throw new Error("Not authenticated");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`https://api.spotify.com/v1${path}`, { ...init, headers });
}

export type NowPlaying = {
  isPlaying: boolean;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string | null;
  progressMs: number;
  durationMs: number;
  hasActiveDevice: boolean;
};

export async function getNowPlaying(): Promise<NowPlaying | null> {
  const res = await api("/me/player");
  if (res.status === 204) return { isPlaying: false, title: "", artist: "", album: "", artworkUrl: null, progressMs: 0, durationMs: 0, hasActiveDevice: false };
  if (!res.ok) throw new Error(`Spotify error ${res.status}`);
  const d = await res.json();
  const item = d.item;
  return {
    isPlaying: !!d.is_playing,
    title: item?.name ?? "",
    artist: (item?.artists ?? []).map((a: { name: string }) => a.name).join(", "),
    album: item?.album?.name ?? "",
    artworkUrl: item?.album?.images?.[0]?.url ?? null,
    progressMs: d.progress_ms ?? 0,
    durationMs: item?.duration_ms ?? 0,
    hasActiveDevice: !!d.device,
  };
}

export async function play() {
  await api("/me/player/play", { method: "PUT" });
}
export async function pause() {
  await api("/me/player/pause", { method: "PUT" });
}
export async function next() {
  await api("/me/player/next", { method: "POST" });
}
export async function previous() {
  await api("/me/player/previous", { method: "POST" });
}

export type SpotifyDevice = { id: string; name: string; is_active: boolean; type: string };

export async function getDevices(): Promise<SpotifyDevice[]> {
  const res = await api("/me/player/devices");
  if (!res.ok) return [];
  const data = await res.json();
  return data.devices ?? [];
}

export async function transferPlayback(deviceId: string, play = false): Promise<void> {
  await api("/me/player", {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play }),
  });
}

export async function transferToFirstDevice(): Promise<boolean> {
  const devices = await getDevices();
  const device = devices[0];
  if (!device) return false;
  await transferPlayback(device.id, false);
  return true;
}

/**
 * Polls /me/player/devices until a device reports `is_active: true` (or any
 * device with the given id is active). Returns true when an active device is
 * detected, false on timeout. Used after `transferPlayback` to avoid the
 * race condition where Spotify hasn't yet promoted the target device.
 */
export async function waitForActiveDevice(
  deviceId?: string,
  timeoutMs = 1500,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const devices = await getDevices();
    const ok = deviceId
      ? devices.some((d) => d.id === deviceId && d.is_active)
      : devices.some((d) => d.is_active);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

export async function playContext(contextUri: string, deviceId?: string): Promise<void> {
  const path = deviceId ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}` : "/me/player/play";
  const res = await api(path, {
    method: "PUT",
    body: JSON.stringify({ context_uri: contextUri }),
  });
  if (!res.ok && res.status !== 204) {
    // 404 = device went to sleep between transfer and play. Wake it once
    // more and retry — the most common cause of "music didn't start" on
    // physical iPhones after the screen has been off for a while.
    if (res.status === 404 && deviceId) {
      await transferPlayback(deviceId, false);
      const ready = await waitForActiveDevice(deviceId, 1500);
      if (ready) {
        const retry = await api(path, {
          method: "PUT",
          body: JSON.stringify({ context_uri: contextUri }),
        });
        if (retry.ok || retry.status === 204) return;
        throw new Error(`Spotify error ${retry.status}`);
      }
    }
    throw new Error(`Spotify error ${res.status}`);
  }
}

export type SpotifyPlaylist = {
  id: string;
  name: string;
  uri: string;
  imageUrl: string | null;
  ownerName: string;
  trackCount: number;
};

export async function getMyPlaylists(): Promise<SpotifyPlaylist[]> {
  const out: SpotifyPlaylist[] = [];
  let url: string | null = "/me/playlists?limit=50";
  while (url) {
    const res = await api(url);
    if (!res.ok) throw new Error(`Spotify error ${res.status}`);
    const data = await res.json();
    for (const item of data.items ?? []) {
      if (!item) continue;
      out.push({
        id: item.id,
        name: item.name,
        uri: item.uri,
        imageUrl: item.images?.[0]?.url ?? null,
        ownerName: item.owner?.display_name ?? "",
        trackCount: item.tracks?.total ?? 0,
      });
    }
    if (data.next) {
      const u = new URL(data.next);
      url = u.pathname.replace(/^\/v1/, "") + u.search;
    } else {
      url = null;
    }
  }
  return out;
}

// Also patch play() so it doesn't silently swallow errors at call sites that need them.

