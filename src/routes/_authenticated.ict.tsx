import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, Cell, NumInput, SectionHeader } from "./index";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/ict")({
  head: () => ({
    meta: [
      { title: "ICT Command Center — Market.knight" },
      { name: "description", content: "Premium/discount calculator, ICT kill zones, liquidity scanner, daily bias and trade checklist." },
      { property: "og:title", content: "ICT Command Center — Market.knight" },
      { property: "og:description", content: "Premium/discount calculator, ICT kill zones, liquidity scanner, daily bias and trade checklist." },
      { property: "og:url", content: "https://market-knight-edge.lovable.app/ict" },
    ],
    links: [{ rel: "canonical", href: "https://market-knight-edge.lovable.app/ict" }],
  }),
  component: IctPage,
});

// ICT Kill Zones (UTC)
interface KZ { name: string; openH: number; openM: number; closeH: number; closeM: number; color: string; tag: string; }
const KILL_ZONES: KZ[] = [
  { name: "Asian Session",       openH: 23, openM: 0,  closeH: 4,  closeM: 0,  color: "#9b8cff", tag: "ASIA" },
  { name: "London Kill Zone",    openH: 7,  openM: 0,  closeH: 10, closeM: 0,  color: "#00c8f0", tag: "LDN" },
  { name: "New York Kill Zone",  openH: 12, openM: 0,  closeH: 15, closeM: 0,  color: "#00e87a", tag: "NY" },
  { name: "London Close KZ",     openH: 15, openM: 0,  closeH: 16, closeM: 0,  color: "#ffc800", tag: "LCK" },
];

function nowMinUTC(d: Date) { return d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60; }
function kzWindow(k: KZ) {
  const open = k.openH * 60 + k.openM;
  let close = k.closeH * 60 + k.closeM;
  if (close <= open) close += 1440;
  return { open, close };
}
function kzActive(k: KZ, now: number) {
  const { open, close } = kzWindow(k);
  return (now >= open && now < close) || (now + 1440 >= open && now + 1440 < close);
}
function kzUntilOpen(k: KZ, now: number) {
  const open = k.openH * 60 + k.openM;
  let d = open - now; if (d <= 0) d += 1440; return d;
}
function kzUntilClose(k: KZ, now: number) {
  const { open, close } = kzWindow(k);
  const t = now >= open ? now : now + 1440;
  return close - t;
}
function fmtCD(min: number) {
  const t = Math.max(0, Math.round(min * 60));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function IctPage() {
  // --- Premium / Discount ---
  const [hi, setHi] = useLocalStorage<string>("ict.hi", "");
  const [lo, setLo] = useLocalStorage<string>("ict.lo", "");
  const [cur, setCur] = useLocalStorage<string>("ict.cur", "");

  // --- Liquidity inputs ---
  const [pdh, setPdh] = useLocalStorage<string>("ict.pdh", "");
  const [pdl, setPdl] = useLocalStorage<string>("ict.pdl", "");
  const [pwh, setPwh] = useLocalStorage<string>("ict.pwh", "");
  const [pwl, setPwl] = useLocalStorage<string>("ict.pwl", "");
  const [eqh, setEqh] = useLocalStorage<string>("ict.eqh", "");
  const [eql, setEql] = useLocalStorage<string>("ict.eql", "");

  const H = parseFloat(hi), L = parseFloat(lo), C = parseFloat(cur);
  const valid = isFinite(H) && isFinite(L) && H > L;
  const eq = valid ? (H + L) / 2 : NaN;
  const range = valid ? H - L : NaN;
  const inPremium = valid && isFinite(C) && C > eq;
  const inDiscount = valid && isFinite(C) && C < eq;
  const posPct = valid && isFinite(C) ? Math.min(100, Math.max(0, ((C - L) / (H - L)) * 100)) : NaN;

  // --- Risk ---
  const [acct, setAcct] = useLocalStorage<string>("ict.acct", "10000");
  const [riskPct, setRiskPct] = useLocalStorage<string>("ict.rpct", "1");
  const [entry, setEntry] = useState(""); const [sl, setSl] = useState(""); const [tp, setTp] = useState("");
  const a = parseFloat(acct) || 0, rp = parseFloat(riskPct) || 0;
  const E = parseFloat(entry), S = parseFloat(sl), T = parseFloat(tp);
  const stop = Math.abs(E - S), reward = Math.abs(T - E);
  const rr = stop > 0 ? reward / stop : 0;
  const dollarRisk = a * (rp / 100);
  const units = stop > 0 ? dollarRisk / stop : 0;
  const profit = units * reward;

  // --- Clock ---
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const utc = nowMinUTC(now);
  const localStr = now.toLocaleTimeString();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // --- Liquidity sorted ---
  const C2 = isFinite(C) ? C : NaN;
  const bsl = useMemo(() => [
    { label: "PDH", v: parseFloat(pdh) },
    { label: "PWH", v: parseFloat(pwh) },
    { label: "EQH", v: parseFloat(eqh) },
    { label: "Range High", v: H },
  ].filter(x => isFinite(x.v) && (isNaN(C2) || x.v >= C2)).sort((a, b) => a.v - b.v), [pdh, pwh, eqh, H, C2]);

  const ssl = useMemo(() => [
    { label: "PDL", v: parseFloat(pdl) },
    { label: "PWL", v: parseFloat(pwl) },
    { label: "EQL", v: parseFloat(eql) },
    { label: "Range Low", v: L },
  ].filter(x => isFinite(x.v) && (isNaN(C2) || x.v <= C2)).sort((a, b) => b.v - a.v), [pdl, pwl, eql, L, C2]);

  const nearest = useMemo(() => {
    if (isNaN(C2)) return null;
    const all = [...bsl, ...ssl];
    if (!all.length) return null;
    return all.reduce((best, x) => Math.abs(x.v - C2) < Math.abs(best.v - C2) ? x : best);
  }, [bsl, ssl, C2]);

  // --- Checklist ---
  const [chk, setChk] = useLocalStorage<boolean[]>("ict.chk", [false, false, false, false, false, false]);
  const checklist = [
    "Daily bias identified",
    "Price in premium or discount",
    "Liquidity targeted",
    "Market structure shift confirmed",
    "Kill zone active",
    "Risk acceptable",
  ];
  const allChecked = chk.every(Boolean);

  const activeKZ = KILL_ZONES.find(k => kzActive(k, utc));

  return (
    <div className="space-y-4 pb-4">
      <SectionHeader title="ICT Command Center" subtitle="Precision. Structure. Execution." />

      {/* Premium/Discount */}
      <Card title="Premium / Discount Calculator">
        <div className="grid grid-cols-3 gap-2">
          <NumInput label="Swing High" value={hi} onChange={setHi} dec={5} />
          <NumInput label="Swing Low" value={lo} onChange={setLo} dec={5} />
          <NumInput label="Current" value={cur} onChange={setCur} dec={5} />
        </div>

        {valid && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Cell label="Range" value={fmt(range, 5)} />
              <Cell label="Equilibrium" value={fmt(eq, 5)} tone="warning" />
              <Cell label="Status" value={isFinite(C) ? (inPremium ? "PREMIUM" : inDiscount ? "DISCOUNT" : "AT EQ") : "—"} tone={inPremium ? "danger" : inDiscount ? "success" : "warning"} />
            </div>

            <div className="mt-3 relative h-40 rounded-md overflow-hidden border border-border">
              <div className="absolute inset-x-0 top-0 h-1/2" style={{ background: "linear-gradient(180deg, rgba(255,51,85,0.28), rgba(255,51,85,0.08))" }} />
              <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "linear-gradient(0deg, rgba(0,232,122,0.28), rgba(0,232,122,0.08))" }} />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px" style={{ background: "#ffc800", boxShadow: "0 0 8px #ffc800" }} />
              <div className="absolute left-2 top-1 text-[10px] font-bold tracking-wider text-danger">PREMIUM · {fmt(eq,5)}–{fmt(H,5)}</div>
              <div className="absolute left-2 bottom-1 text-[10px] font-bold tracking-wider text-success">DISCOUNT · {fmt(L,5)}–{fmt(eq,5)}</div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] mono font-bold text-warning bg-background/60 px-1 rounded">EQ {fmt(eq,5)}</div>
              {isFinite(C) && isFinite(posPct) && (
                <div className="absolute left-0 right-0" style={{ top: `${100 - posPct}%` }}>
                  <div className="h-px w-full bg-accent" style={{ boxShadow: "0 0 6px #00c8f0" }} />
                  <div className="absolute right-2 -translate-y-1/2 text-[10px] mono font-bold text-accent bg-background/70 px-1 rounded">PRICE {fmt(C,5)}</div>
                </div>
              )}
            </div>
          </>
        )}
        {!valid && <div className="mt-2 text-xs text-muted-foreground">Enter swing high &gt; swing low to compute.</div>}
      </Card>

      {/* Kill Zones */}
      <Card title="ICT Kill Zone Dashboard" subtitle={`Local: ${localStr} · ${tz}`}>
        <div className="space-y-2">
          {KILL_ZONES.map((k) => {
            const active = kzActive(k, utc);
            const cd = active ? kzUntilClose(k, utc) : kzUntilOpen(k, utc);
            const local = (h: number, m: number) => {
              const d = new Date(); d.setUTCHours(h, m, 0, 0);
              return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            };
            return (
              <div key={k.name} className={`rounded-md border p-2 ${active ? "border-accent/60 bg-accent/10" : "border-border bg-surface-2"}`}>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: k.color, boxShadow: active ? `0 0 8px ${k.color}` : undefined }} />
                    <span className="font-bold">{k.name}</span>
                    <span className="mono text-muted-foreground">{local(k.openH, k.openM)}–{local(k.closeH, k.closeM)}</span>
                  </div>
                  <span className={`tag ${active ? "bg-success/20 text-success border border-success/40" : "bg-muted text-muted-foreground"}`}>{active ? "LIVE" : "WAIT"}</span>
                </div>
                <div className="mt-1 text-[11px] mono">
                  {active ? <span className="text-success">Ends in {fmtCD(cd)}</span> : <span className="text-foreground/80">Opens in {fmtCD(cd)}</span>}
                </div>
              </div>
            );
          })}
        </div>
        {activeKZ && <div className="mt-2 text-[11px] text-accent font-bold uppercase tracking-wider">▶ {activeKZ.name} active — hunt setups</div>}
      </Card>

      {/* Liquidity Scanner */}
      <Card title="Liquidity Scanner" subtitle="Buy-side above price · Sell-side below">
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="PDH" value={pdh} onChange={setPdh} dec={5} />
          <NumInput label="PDL" value={pdl} onChange={setPdl} dec={5} />
          <NumInput label="PWH" value={pwh} onChange={setPwh} dec={5} />
          <NumInput label="PWL" value={pwl} onChange={setPwl} dec={5} />
          <NumInput label="Equal Highs" value={eqh} onChange={setEqh} dec={5} />
          <NumInput label="Equal Lows" value={eql} onChange={setEql} dec={5} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-danger mb-1">↑ BSL (Buy-Side)</div>
            <div className="space-y-1">
              {bsl.length ? bsl.map((x, i) => (
                <div key={i} className="flex justify-between items-center rounded bg-surface-2 px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{x.label}</span>
                  <span className="mono font-bold text-danger">{fmt(x.v, 5)}</span>
                </div>
              )) : <div className="text-[11px] text-muted-foreground">—</div>}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-success mb-1">↓ SSL (Sell-Side)</div>
            <div className="space-y-1">
              {ssl.length ? ssl.map((x, i) => (
                <div key={i} className="flex justify-between items-center rounded bg-surface-2 px-2 py-1 text-xs">
                  <span className="text-muted-foreground">{x.label}</span>
                  <span className="mono font-bold text-success">{fmt(x.v, 5)}</span>
                </div>
              )) : <div className="text-[11px] text-muted-foreground">—</div>}
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Bias Panel */}
      <Card title="Daily Bias Panel">
        <div className="grid grid-cols-2 gap-2">
          <Cell label="Current Price" value={isFinite(C) ? fmt(C, 5) : "—"} tone="warning" />
          <Cell label="Equilibrium" value={valid ? fmt(eq, 5) : "—"} />
          <Cell label="Range High" value={valid ? fmt(H, 5) : "—"} tone="danger" />
          <Cell label="Range Low" value={valid ? fmt(L, 5) : "—"} tone="success" />
          <Cell label="Δ to PDH" value={isFinite(C) && isFinite(parseFloat(pdh)) ? fmt(parseFloat(pdh) - C, 5) : "—"} />
          <Cell label="Δ to PDL" value={isFinite(C) && isFinite(parseFloat(pdl)) ? fmt(C - parseFloat(pdl), 5) : "—"} />
          <Cell label="Bias" value={inPremium ? "Trading in PREMIUM" : inDiscount ? "Trading in DISCOUNT" : valid && isFinite(C) ? "At EQ" : "—"} tone={inPremium ? "danger" : inDiscount ? "success" : "warning"} />
          <Cell label="Nearest Liquidity" value={nearest ? `${nearest.label} ${fmt(nearest.v,5)}` : "—"} />
        </div>
      </Card>

      {/* Trade Checklist */}
      <Card title="Trade Checklist">
        <ul className="space-y-1.5">
          {checklist.map((t, i) => (
            <li key={i}>
              <button
                onClick={() => { const next = [...chk]; next[i] = !next[i]; setChk(next); }}
                className={`flex items-center gap-2 w-full text-left text-sm rounded-md px-2 py-2 border ${chk[i] ? "border-success/40 bg-success/10 text-success" : "border-border bg-surface-2 text-foreground"}`}
              >
                <span className={`h-4 w-4 rounded grid place-items-center text-[10px] font-bold ${chk[i] ? "bg-success text-background" : "border border-muted-foreground"}`}>{chk[i] ? "✓" : ""}</span>
                {t}
              </button>
            </li>
          ))}
        </ul>
        {allChecked && (
          <div className="mt-3 rounded-md border border-success/60 bg-success/15 p-3 text-center">
            <div className="text-xs uppercase tracking-widest text-success font-bold">Setup Conditions Met</div>
            <div className="text-sm font-extrabold text-success mt-0.5">READY FOR EXECUTION</div>
          </div>
        )}
      </Card>

      {/* Risk Module */}
      <Card title="Risk Management">
        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Account ($)" value={acct} onChange={setAcct} dec={0} />
          <NumInput label="Risk %" value={riskPct} onChange={setRiskPct} dec={2} />
          <NumInput label="Entry" value={entry} onChange={setEntry} dec={5} />
          <NumInput label="Stop Loss" value={sl} onChange={setSl} dec={5} />
          <NumInput label="Take Profit" value={tp} onChange={setTp} dec={5} />
          <Cell label="$ at Risk" value={dollarRisk > 0 ? `$${fmt(dollarRisk, 2)}` : "—"} tone="danger" />
          <Cell label="Position Size" value={units > 0 ? fmt(units, 4) : "—"} tone="warning" />
          <Cell label="R:R" value={rr > 0 ? `${fmt(rr, 2)}R` : "—"} tone={rr >= 2 ? "success" : rr > 0 ? "warning" : undefined} />
          <Cell label="Potential Profit" value={profit > 0 ? `$${fmt(profit, 2)}` : "—"} tone="success" />
        </div>
      </Card>
    </div>
  );
}
