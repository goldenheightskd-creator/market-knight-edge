import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  // SSR off: session lives in localStorage and only the client can read it.
  ssr: false,
  component: AuthGate,
});

function AuthGate() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        setReady(true);
        return;
      }
      setAllowed(true);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setAllowed(false);
        navigate({ to: "/auth", replace: true });
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  if (!ready) {
    return <div className="min-h-[60vh] grid place-items-center text-xs text-muted-foreground">Loading…</div>;
  }
  if (!allowed) return null;
  return <Outlet />;
}
