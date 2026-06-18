import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, SectionHeader } from "./index";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/sessions")({
  head: () => ({
    meta: [
      { title: "Session Clock — Market.knight" },
      { name: "description", content: "Live UTC clock with all 5 trading sessions, kill zones, market activity and Kenya EAT reference." },
      { property: "og:title", content: "Session Clock — Market.knight" },
      { property: "og:description", content: "Live UTC clock with all 5 trading sessions, kill zones, market activity and Kenya EAT reference." },
      { property: "og:url", content: "https://market-knight-edge.lovable.app/sessions" },
    ],
    links: [{ rel: "canonical", href: "https://market-knight-edge.lovable.app/sessions" }],
  }),
  component: SessionsPage,
});

interface Session {
  name: string;
  openH: number; openM: number;
  closeH: number; closeM: number;
  color: string;
}

// Open/Close times in UTC (approx, ignoring DST shifts)
const SESSIONS: Session[] = [
  { name: "Sydney",      openH: 22, openM: 0,  closeH: 7,  closeM: 0,  color: "#9b8cff" },
  { name: "Tokyo",       openH: 0,  openM: 0,  closeH: 9,  closeM: 0,  color: "#ff8ad1" },
  { name: "London",      openH: 7,  openM: 0,  closeH: 16, closeM: 0,  color: "#00c8f0" },
  { name: "LDN/NY Overlap", openH: 13, openM: 0, closeH: 16, closeM: 0, color: "#ffc800" },
  { name: "New York",    openH: 13, openM: 0,  closeH: 22, closeM: 0,  color: "#00e87a" },
];

function minutesUTC(d: Date) { return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60; }
function sessionMinutes(s: Session) {
  const open = s.openH * 60 + s.openM;
  let close = s.closeH * 60 + s.closeM;
  if (close <= open) close += 24 * 60;
  return { open, close, dur: close - open };
}
function isActive(s: Session, now: number) {
  const { open, close } = sessionMinutes(s);
  return (now >= open && now < close) || (now + 1440 >= open && now + 1440 < close);
}
function progress(s: Session, now: number) {
  const { open, close, dur } = sessionMinutes(s);
  const t = now >= open ? now : now + 1440;
  if (t < open || t > close) return 0;
  return ((t - open) / dur) * 100;
}
function untilOpen(s: Session, now: number) {
  const open = s.openH * 60 + s.openM;
  let diff = open - now;
  if (diff <= 0) diff += 1440;
  return diff;
}
function untilClose(s: Session, now: number) {
  const { open, close } = sessionMinutes(s);
  const t = now >= open ? now : now + 1440;
  return close - t;
}
function fmtCountdown(min: number) {
  const total = Math.max(0, Math.round(min * 60));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Activity = "PEAK" | "HIGH" | "MED" | "LOW" | "AVOID";
const MARKETS = ["Forex", "Futures", "Crypto", "Indices", "Stocks"] as const;
function activityFor(mkt: typeof MARKETS[number], now: number): Activity {
  const inLDN = isActive(SESSIONS[2], now);
  const inNY  = isActive(SESSIONS[4], now);
  const inOL  = isActive(SESSIONS[3], now);
  const inAsia = isActive(SESSIONS[0], now) || isActive(SESSIONS[1], now);
  if (mkt === "Forex") {
    if (inOL) return "PEAK";
    if (inLDN || inNY) return "HIGH";
    if (inAsia) return "MED";
    return "LOW";
  }
  if (mkt === "Futures" || mkt === "Indices") {
    if (inOL) return "PEAK";
    if (inNY) return "HIGH";
    if (inLDN) return "MED";
    return "LOW";
  }
  if (mkt === "Stocks") {
    // US cash session 14:30–21:00 UTC
    if (now >= 14.5 * 60 && now < 21 * 60) return inOL ? "PEAK" : "HIGH";
    if (now >= 21 * 60 || now < 14.5 * 60) return "AVOID";
    return "LOW";
  }
  // Crypto — 24/7 but lean to LDN/NY
  if (inOL) return "PEAK";
  if (inLDN || inNY) return "HIGH";
  return "MED";
}
function actColor(a: Activity) {
  return a === "PEAK" ? "bg-warning text-background"
    : a === "HIGH" ? "bg-success text-background"
    : a === "MED" ? "bg-accent text-accent-foreground"
    : a === "LOW" ? "bg-muted text-muted-foreground"
    : "bg-danger text-white";
}

function SessionsPage() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const utcMin = minutesUTC(now);
  const eatHours = (now.getUTCHours() + 3) % 24;
  const eatMin = now.getUTCMinutes();
  const eatSec = now.getUTCSeconds();
  const eatStr = `${String(eatHours).padStart(2, "0")}:${String(eatMin).padStart(2, "0")}:${String(eatSec).padStart(2, "0")}`;
  const inBestEAT = eatHours >= 16 && eatHours < 19;

  const advice = (() => {
    const ol = isActive(SESSIONS[3], utcMin);
    const ny = isActive(SESSIONS[4], utcMin);
    const ldn = isActive(SESSIONS[2], utcMin);
    const asia = isActive(SESSIONS[0], utcMin) || isActive(SESSIONS[1], utcMin);
    if (ol) return { tone: "warning", title: "PEAK — London/NY overlap", body: "Best liquidity of the day. Trade A+ setups only; volatility expands." };
    if (ny) return { tone: "success", title: "NY session active", body: "Strong moves on news; respect 14:30 cash open ignition." };
    if (ldn) return { tone: "accent", title: "London session active", body: "Trend session. Watch for London raid → reverse pattern." };
    if (asia) return { tone: "muted", title: "Asia session", body: "Range conditions. Mark Asia high/low for London raid plays." };
    return { tone: "muted", title: "Quiet window", body: "Low liquidity. Avoid new entries; manage existing trades." };
  })();

  return (
    <div className="space-y-4">
      <SectionHeader title="Session Clock" subtitle="Time is the edge. Trade when the market is awake." />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-surface-2 px-3 py-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">UTC</div>
            <div className="mono text-2xl font-bold text-accent">{fmtCountdown(utcMin)}</div>
          </div>
          <div className={`rounded-md px-3 py-3 ${inBestEAT ? "bg-warning/15 border border-warning/50" : "bg-surface-2"}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nairobi · EAT</div>
            <div className={`mono text-2xl font-bold ${inBestEAT ? "text-warning" : "text-foreground"}`}>{eatStr}</div>
          </div>
        </div>
        <div className={`mt-2 rounded-md p-2 text-xs border ${advice.tone === "warning" ? "border-warning/40 bg-warning/10 text-warning" : advice.tone === "success" ? "border-success/40 bg-success/10 text-success" : advice.tone === "accent" ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-surface-2 text-muted-foreground"}`}>
          <div className="font-bold uppercase tracking-wider text-[11px]">{advice.title}</div>
          <div className="mt-0.5 text-foreground/80">{advice.body}</div>
        </div>
      </Card>

      <Card title="Trading Sessions">
        <div className="space-y-3">
          {SESSIONS.map((s) => {
            const active = isActive(s, utcMin);
            const prog = progress(s, utcMin);
            const cd = active ? untilClose(s, utcMin) : untilOpen(s, utcMin);
            return (
              <div key={s.name}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color, boxShadow: active ? `0 0 8px ${s.color}` : undefined }} />
                    <span className="font-bold">{s.name}</span>
                    <span className="mono text-muted-foreground">{String(s.openH).padStart(2,"0")}:{String(s.openM).padStart(2,"0")}–{String(s.closeH).padStart(2,"0")}:{String(s.closeM).padStart(2,"0")} UTC</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`tag ${active ? "bg-success/20 text-success border border-success/40" : "bg-muted text-muted-foreground"}`}>{active ? "OPEN" : "CLOSED"}</span>
                    <span className="mono text-[11px] text-foreground/80">{active ? "closes" : "opens"} {fmtCountdown(cd)}</span>
                  </div>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${prog}%`, backgroundColor: s.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Market Activity">
        <div className="space-y-1.5">
          {MARKETS.map((m) => {
            const a = activityFor(m, utcMin);
            return (
              <div key={m} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="font-semibold">{m}</span>
                <span className={`tag ${actColor(a)}`}>{a}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Kenya EAT Reference">
        <ul className="space-y-1 text-sm">
          <li className="flex justify-between"><span>London Open</span><span className="mono text-accent">10:00 AM</span></li>
          <li className="flex justify-between"><span>NYSE Cash Open</span><span className="mono text-success">04:30 PM</span></li>
          <li className="flex justify-between"><span className="font-bold">Best window</span><span className="mono text-warning font-bold">04:00 – 07:00 PM</span></li>
        </ul>
      </Card>
    </div>
  );
}
