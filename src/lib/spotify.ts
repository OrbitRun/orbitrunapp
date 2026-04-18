// Spotify Web API client with PKCE OAuth (no backend, no client secret).
// Replace SPOTIFY_CLIENT_ID with your own Client ID from
// https://developer.spotify.com/dashboard

export const SPOTIFY_CLIENT_ID = "REPLACE_WITH_YOUR_SPOTIFY_CLIENT_ID";

export const SPOTIFY_SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
].join(" ");

const TOKEN_KEY = "pulse.spotify.token";
const VERIFIER_KEY = "pulse.spotify.verifier";

export type SpotifyToken = {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // epoch ms
  token_type: string;
  scope: string;
};

export function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
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
  return SPOTIFY_CLIENT_ID !== "REPLACE_WITH_YOUR_SPOTIFY_CLIENT_ID" && SPOTIFY_CLIENT_ID.length > 0;
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
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
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
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
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
