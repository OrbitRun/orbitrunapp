import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Server-side proxy for Spotify's PKCE token endpoint.
// Handles both `authorization_code` and `refresh_token` grants.
//
// Why this exists even though PKCE doesn't strictly need a backend:
//  - Removes browser↔Spotify CORS surface and the need to expose the token
//    endpoint to the page directly.
//  - Centralizes validation so a malformed client request can't hit Spotify.
//  - Makes it trivial to swap in a server-side refresh-token store later.

const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

const AuthCodeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  client_id: z.string().min(1).max(64),
  code: z.string().min(1).max(2048),
  code_verifier: z.string().min(43).max(128),
  redirect_uri: z.string().url().max(512),
});

const RefreshSchema = z.object({
  grant_type: z.literal("refresh_token"),
  client_id: z.string().min(1).max(64),
  refresh_token: z.string().min(1).max(2048),
});

const BodySchema = z.discriminatedUnion("grant_type", [AuthCodeSchema, RefreshSchema]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export const Route = createFileRoute("/api/spotify/token")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS_HEADERS }),

      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse({ error: "invalid_json" }, 400);
        }

        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse(
            { error: "invalid_request", details: parsed.error.flatten() },
            400,
          );
        }

        // Build the URL-encoded payload Spotify expects.
        const form = new URLSearchParams();
        for (const [k, v] of Object.entries(parsed.data)) {
          form.set(k, String(v));
        }

        let upstream: Response;
        try {
          upstream = await fetch(SPOTIFY_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form,
          });
        } catch {
          return jsonResponse({ error: "upstream_unreachable" }, 502);
        }

        const text = await upstream.text();
        // Pass through Spotify's status + body; surfaces granular errors
        // (invalid_grant, invalid_client, etc.) to the client unchanged.
        return new Response(text, {
          status: upstream.status,
          headers: {
            "Content-Type":
              upstream.headers.get("Content-Type") ?? "application/json",
            ...CORS_HEADERS,
          },
        });
      },
    },
  },
});
