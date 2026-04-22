// Spotify Web API client with PKCE OAuth (no backend, no client secret).
// Replace SPOTIFY_CLIENT_ID with your own Client ID from
// https://developer.spotify.com/dashboard

export const SPOTIFY_CLIENT_ID = "60749f03c1184bc6905c571975d97208";

export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
].join(" ");

// Token storage strategy (security):
// - access_token + expiry: in-memory only (lost on full reload — we transparently
//   recover via refresh_token).
// - refresh_token: sessionStorage (auto-cleared when the tab closes). Deliberate
//   trade-off: we lose "stay signed in across browser restarts" so a long-lived
//   credential is never sitting in persistent storage where future XSS or a
//   third-party script could exfiltrate it.
// - Any legacy localStorage entry from earlier versions is migrated then deleted.
const LEGACY_TOKEN_KEY = "pulse.spotify.token";
const REFRESH_KEY = "pulse.spotify.refresh";
const VERIFIER_KEY = "pulse.spotify.verifier";
const STATE_KEY = "pulse.spotify.state";

export type SpotifyToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
  token_type: string;
  scope: string;
};

// In-memory access token (not persisted across full reloads).
let memoryToken: SpotifyToken | null = null;

function readRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

function writeRefreshToken(rt: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (rt) sessionStorage.setItem(REFRESH_KEY, rt);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore quota/availability errors */
  }
}

// One-time migration from the old localStorage location to split storage.
function migrateLegacyToken() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (!raw) return;
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    const parsed = JSON.parse(raw) as Partial<SpotifyToken>;
    if (parsed?.refresh_token) writeRefreshToken(parsed.refresh_token);
  } catch {
    try {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}
migrateLegacyToken();

export function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/callback`;
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
  if (memoryToken) return memoryToken;
  // No in-memory token yet, but a refresh token may exist from this tab session.
  const rt = readRefreshToken();
  if (!rt) return null;
  // Stub with expires_at=0 forces a refresh on the next getValidToken() call.
  return {
    access_token: "",
    refresh_token: rt,
    expires_at: 0,
    token_type: "Bearer",
    scope: "",
  };
}

export function setStoredToken(t: SpotifyToken | null) {
  if (!t) {
    memoryToken = null;
    writeRefreshToken(null);
    return;
  }
  memoryToken = t;
  if (t.refresh_token) writeRefreshToken(t.refresh_token);
}

export function isConfigured(): boolean {
  return SPOTIFY_CLIENT_ID.length > 0;
}

export async function beginAuth(): Promise<void> {
  if (!isConfigured()) throw new Error("Spotify Client ID not configured");
  const verifier = randomString(96);
  const challenge = base64url(await sha256(verifier));
  // CSRF protection: random state we'll verify on callback.
  const state = randomString(32);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
    state,
  });
  // Force HTTPS endpoint (Spotify requires it; explicit for clarity).
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Endpoint for our server-side proxy that forwards to Spotify's token API.
// Keeps CORS surface and request validation off the page itself.
const TOKEN_PROXY_URL = "/api/spotify/token";

async function tokenProxy(body: Record<string, string>): Promise<Response> {
  return fetch(TOKEN_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function exchangeCode(code: string, returnedState?: string | null): Promise<SpotifyToken> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(STATE_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier");
  // CSRF check: returned state must match what we generated.
  if (expectedState && returnedState !== expectedState) {
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    throw new Error("Invalid OAuth state");
  }
  const res = await tokenProxy({
    grant_type: "authorization_code",
    client_id: SPOTIFY_CLIENT_ID,
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });
  if (!res.ok) {
    let msg = `Token exchange failed: ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error_description) msg = `Spotify: ${err.error_description}`;
      else if (err?.error) msg = `Spotify: ${err.error}`;
    } catch {
      /* keep generic message */
    }
    throw new Error(msg);
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
  sessionStorage.removeItem(STATE_KEY);
  return tok;
}

async function refreshToken(): Promise<SpotifyToken | null> {
  const cur = getStoredToken();
  if (!cur?.refresh_token) return null;
  const res = await tokenProxy({
    grant_type: "refresh_token",
    client_id: SPOTIFY_CLIENT_ID,
    refresh_token: cur.refresh_token,
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
  // Wipe any in-flight OAuth artifacts so a stale state can't be reused.
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
  }
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

export async function transferToFirstDevice(): Promise<boolean> {
  const res = await api("/me/player/devices");
  if (!res.ok) return false;
  const data = await res.json();
  const device = data.devices?.[0];
  if (!device) return false;
  await api("/me/player", {
    method: "PUT",
    body: JSON.stringify({ device_ids: [device.id], play: false }),
  });
  return true;
}
