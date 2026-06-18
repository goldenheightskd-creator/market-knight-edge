import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Market.knight" },
      { name: "description", content: "Sign in to Market.knight with Google to access your trading toolkit." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function signIn() {
    setErr(null);
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (res.error) {
      setErr(res.error.message ?? "Sign-in failed");
      setLoading(false);
      return;
    }
    if (res.redirected) return; // browser is navigating
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 grid place-items-center rounded-2xl bg-gradient-to-br from-accent to-[#0080a0] glow-accent">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-background" fill="currentColor" aria-hidden="true">
              <path d="M5 21h14v-2H5v2zM6 8l3 3 3-6 3 6 3-3v9H6V8z"/>
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            Market<span className="text-accent">.knight</span>
          </h1>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">Pro Trading Toolkit</p>
          <p className="mt-4 text-sm text-muted-foreground">Sign in to sync your levels, journal & dashboard across devices.</p>
        </div>

        <button
          disabled={loading}
          onClick={signIn}
          className="mt-6 w-full h-12 rounded-md bg-white text-[#1f1f1f] font-semibold text-sm flex items-center justify-center gap-3 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.1A6.99 6.99 0 0 1 5.47 12c0-.73.13-1.44.36-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.83z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z"/>
          </svg>
          {loading ? "Opening Google…" : "Sign in with Google"}
        </button>

        {err && (
          <div className="mt-3 rounded-md border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{err}</div>
        )}

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          By continuing you agree to use this app for educational purposes only — nothing here is financial advice.
        </p>
      </div>
    </div>
  );
}
