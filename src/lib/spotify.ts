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

export async function playContext(contextUri: string, deviceId?: string): Promise<void> {
  const path = deviceId ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}` : "/me/player/play";
  const res = await api(path, {
    method: "PUT",
    body: JSON.stringify({ context_uri: contextUri }),
  });
  if (!res.ok && res.status !== 204) {
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

