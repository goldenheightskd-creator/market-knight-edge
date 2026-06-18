import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/cloud";

export function Header() {
  const { user } = useAuthSession();
  const navigate = useNavigate();
  const avatar = (user?.user_metadata as any)?.avatar_url as string | undefined;
  const name = ((user?.user_metadata as any)?.full_name as string | undefined) ?? user?.email;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative h-8 w-8 grid place-items-center rounded-md bg-gradient-to-br from-accent to-[#0080a0] glow-accent">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-background" fill="currentColor" aria-hidden="true">
              <path d="M5 21h14v-2H5v2zM6 8l3 3 3-6 3 6 3-3v9H6V8z"/>
            </svg>
          </div>
          <div className="leading-none">
            <div className="text-[15px] font-extrabold tracking-tight">
              Market<span className="text-accent">.knight</span>
            </div>
            <div className="text-[10px] text-muted-foreground tracking-widest uppercase">Pro Trading Toolkit</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <LiveUtc />
          {user && (
            <>
              {avatar ? (
                <img src={avatar} alt={name ?? "user"} className="h-7 w-7 rounded-full border border-border" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-7 w-7 rounded-full bg-accent/20 text-accent grid place-items-center text-[11px] font-bold">{(name ?? "?").slice(0,1).toUpperCase()}</div>
              )}
              <button onClick={signOut} className="h-7 w-7 grid place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground hover:text-danger" aria-label="Sign out" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function LiveUtc() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      setT(`${hh}:${mm} UTC`);
    };
    tick();
    const i = setInterval(tick, 30000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="hidden xs:flex items-center gap-1.5">
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      <span className="mono text-[10px] text-muted-foreground">{t}</span>
    </div>
  );
}
