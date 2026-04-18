import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { exchangeCode } from "@/lib/spotify";

export const Route = createFileRoute("/spotify/callback")({
  component: SpotifyCallback,
});

function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");
    if (err) {
      setError(err);
      return;
    }
    if (!code) {
      setError("Missing authorization code");
      return;
    }
    exchangeCode(code)
      .then(() => navigate({ to: "/" }))
      .catch((e) => setError(e instanceof Error ? e.message : "Auth failed"));
  }, [navigate]);

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <div className="glass-strong rounded-2xl p-6 text-center max-w-sm">
        {error ? (
          <>
            <div className="text-destructive font-bold mb-2">Spotify auth failed</div>
            <div className="text-sm text-muted-foreground">{error}</div>
          </>
        ) : (
          <>
            <div className="font-display font-black text-xl text-neon">Connecting Spotify…</div>
            <div className="text-sm text-muted-foreground mt-2">One moment.</div>
          </>
        )}
      </div>
    </main>
  );
}
