import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeCode } from "@/lib/spotify";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

type Status = "loading" | "error";

function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");
        const errDesc = url.searchParams.get("error_description");

        if (err) {
          throw new Error(errDesc || err);
        }
        if (!code) {
          throw new Error("Missing authorization code from Spotify");
        }

        await exchangeCode(code, state);
        if (cancelled) return;
        // Clean the URL so refresh doesn't re-run the exchange
        window.history.replaceState({}, "", "/auth/callback");
        navigate({ to: "/profile" });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Authentication failed";
        // eslint-disable-next-line no-console
        console.error("[Spotify callback]", msg);
        setError(msg);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="glass-strong rounded-2xl p-6 text-center max-w-sm w-full">
        {status === "loading" ? (
          <>
            <div
              className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-neon border-t-transparent animate-spin"
              aria-label="Loading"
            />
            <div className="font-display font-black text-xl text-neon">
              Forbinder Spotify…
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Et øjeblik.
            </div>
          </>
        ) : (
          <>
            <div className="text-destructive font-bold mb-2">
              Spotify-forbindelse fejlede
            </div>
            <div className="text-sm text-muted-foreground break-words mb-4">
              {error}
            </div>
            <Link
              to="/profile"
              className="inline-block px-4 py-2 rounded-lg bg-neon text-background font-semibold"
            >
              Tilbage til profil
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
