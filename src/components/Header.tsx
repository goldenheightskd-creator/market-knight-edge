import { Link } from "@tanstack/react-router";

export function Header() {
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
        <LiveUtc />
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
function LiveUtc() {
  const [t, setT] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      const ss = String(d.getUTCSeconds()).padStart(2, "0");
      setT(`${hh}:${mm}:${ss}`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
      <span className="mono text-xs text-muted-foreground">{t} UTC</span>
    </div>
  );
}
