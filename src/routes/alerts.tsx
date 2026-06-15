import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Plus, Trash2, Volume2, VolumeX, X, Check } from "lucide-react";
import { Card, NumInput, SectionHeader, Select } from "./index";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { ASSETS, findAsset } from "@/lib/assets";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Screen Marker Alerts — Market.knight" },
      { name: "description", content: "Multi-asset price level alerts with sound, flash and pre-trade checklist." },
    ],
  }),
  component: AlertsPage,
});

type WatchSymbol = "MES" | "EUR/USD" | "BTC/USD" | "ETH/USD" | "SPY";
const WATCH_SYMBOLS: WatchSymbol[] = ["MES", "EUR/USD", "BTC/USD", "ETH/USD", "SPY"];

interface AssetWatch {
  symbol: string;
  current: string;
  pdh: string;
  pdl: string;
  pwh: string;
  pwl: string;
  threshold: string; // distance considered "in kill zone"
}

interface FiredAlert {
  id: string;
  ts: number;
  symbol: string;
  price: number;
  hits: string[]; // labels like "PDH", "Round 4500"
  kind: "single" | "double" | "triple";
}

const DEFAULT_WATCH: Record<string, AssetWatch> = Object.fromEntries(
  WATCH_SYMBOLS.map((s) => {
    const a = findAsset(s);
    const step = a?.roundStep ?? 1;
    return [s, { symbol: s, current: "", pdh: "", pdl: "", pwh: "", pwl: "", threshold: String(step * 0.25) }];
  }),
);

// SPY not in asset list — register fallback
if (!findAsset("SPY")) {
  ASSETS.push({ symbol: "SPY", name: "S&P 500 ETF", group: "Stocks", decimals: 2, roundStep: 5 });
}

const CHECKLIST_QUESTIONS = [
  "Is price at a key level (PDH/PDL/PWH/PWL or major round)?",
  "Is there a clear higher-timeframe bias?",
  "Is the current session active (London / NY)?",
  "Did I see a BOS or CHOCH confirming direction?",
  "Is my Risk:Reward ≥ 2:1?",
  "Is my risk per trade ≤ 1% of account?",
  "Am I emotionally calm and not revenge trading?",
];

function beep(times: number) {
  if (typeof window === "undefined") return;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      const start = now + i * 0.18;
      const end = start + 0.12;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(g).connect(ctx.destination);
      o.start(start);
      o.stop(end + 0.02);
    }
    setTimeout(() => ctx.close(), times * 200 + 400);
  } catch {}
}

function evaluateHits(w: AssetWatch): { hits: string[]; kind: "single" | "double" | "triple" | null } {
  const cp = parseFloat(w.current);
  const thr = parseFloat(w.threshold);
  if (!isFinite(cp) || !isFinite(thr) || thr <= 0) return { hits: [], kind: null };
  const a = findAsset(w.symbol);
  const step = a?.roundStep ?? 1;
  const dec = a?.decimals ?? 2;

  const hits: string[] = [];
  let hasKey = false;
  let hasRound = false;

  const check = (label: string, val: number, isKey: boolean) => {
    if (!isFinite(val)) return;
    if (Math.abs(cp - val) <= thr) {
      hits.push(`${label} ${fmt(val, dec)}`);
      if (isKey) hasKey = true;
    }
  };
  check("PDH", parseFloat(w.pdh), true);
  check("PDL", parseFloat(w.pdl), true);
  check("PWH", parseFloat(w.pwh), true);
  check("PWL", parseFloat(w.pwl), true);

  // nearest round number
  const nearestRound = Math.round(cp / step) * step;
  if (Math.abs(cp - nearestRound) <= thr) {
    hits.push(`Round ${fmt(nearestRound, dec)}`);
    hasRound = true;
  }

  if (hits.length === 0) return { hits: [], kind: null };
  let kind: "single" | "double" | "triple" = "single";
  if (hits.length >= 2 && hasKey && hasRound) kind = "triple";
  else if (hasKey) kind = "double";
  else kind = "single";
  return { hits, kind };
}

function AlertsPage() {
  const [watches, setWatches] = useLocalStorage<Record<string, AssetWatch>>("alerts.watches", DEFAULT_WATCH);
  const [log, setLog] = useLocalStorage<FiredAlert[]>("alerts.log", []);
  const [muted, setMuted] = useLocalStorage<boolean>("alerts.muted", false);
  const [activeSym, setActiveSym] = useState<string>(WATCH_SYMBOLS[0]);
  const [flash, setFlash] = useState(false);
  const [checklist, setChecklist] = useState<{ open: boolean; alert?: FiredAlert; ticks: boolean[] }>({ open: false, ticks: Array(CHECKLIST_QUESTIONS.length).fill(false) });
  const lastFireRef = useRef<Record<string, string>>({}); // symbol -> last hits signature

  const w = watches[activeSym] ?? DEFAULT_WATCH[activeSym];
  const asset = findAsset(activeSym);
  const dec = asset?.decimals ?? 2;

  function update(field: keyof AssetWatch, value: string) {
    setWatches({ ...watches, [activeSym]: { ...w, [field]: value } });
  }

  // Evaluate current asset on price change
  useEffect(() => {
    const { hits, kind } = evaluateHits(w);
    const sig = hits.join("|");
    const last = lastFireRef.current[activeSym] ?? "";
    if (kind && sig && sig !== last) {
      lastFireRef.current[activeSym] = sig;
      const fired: FiredAlert = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ts: Date.now(),
        symbol: activeSym,
        price: parseFloat(w.current),
        hits,
        kind,
      };
      setLog([fired, ...log].slice(0, 100));
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
      if (!muted) beep(kind === "triple" ? 3 : kind === "double" ? 2 : 1);
      setChecklist({ open: true, alert: fired, ticks: Array(CHECKLIST_QUESTIONS.length).fill(false) });
    } else if (!kind) {
      lastFireRef.current[activeSym] = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w.current]);

  const { hits, kind } = useMemo(() => evaluateHits(w), [w]);
  const inZone = !!kind;

  const allTicked = checklist.ticks.every(Boolean);

  return (
    <div className="space-y-4 relative">
      {flash && (
        <div className="fixed inset-0 z-[60] pointer-events-none animate-pulse" style={{ background: "color-mix(in oklab, #ffc800 35%, transparent)" }} />
      )}

      <SectionHeader title="Screen Marker Alerts" subtitle="Multi-asset price alerts · flash + sound + checklist" />

      <Card>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {WATCH_SYMBOLS.map((s) => {
              const active = s === activeSym;
              return (
                <button key={s} onClick={() => setActiveSym(s)}
                  className={`px-2.5 h-8 rounded-md text-xs font-bold tracking-wide border ${active ? "bg-accent text-accent-foreground border-accent" : "bg-surface-2 text-foreground/80 border-border"}`}>
                  {s}
                </button>
              );
            })}
          </div>
          <button onClick={() => setMuted(!muted)} className="h-8 w-8 grid place-items-center rounded-md border border-border bg-surface-2" aria-label="Toggle sound">
            {muted ? <VolumeX className="h-4 w-4 text-danger" /> : <Volume2 className="h-4 w-4 text-success" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <NumInput label="Current Price" value={w.current} onChange={(v) => update("current", v)} dec={dec} />
          <NumInput label="Threshold (±)" value={w.threshold} onChange={(v) => update("threshold", v)} dec={dec} />
          <NumInput label="PDH" value={w.pdh} onChange={(v) => update("pdh", v)} dec={dec} />
          <NumInput label="PDL" value={w.pdl} onChange={(v) => update("pdl", v)} dec={dec} />
          <NumInput label="PWH" value={w.pwh} onChange={(v) => update("pwh", v)} dec={dec} />
          <NumInput label="PWL" value={w.pwl} onChange={(v) => update("pwl", v)} dec={dec} />
        </div>

        <div className={`mt-3 rounded-md border p-3 ${inZone ? "border-warning bg-warning/10" : "border-border bg-surface-2"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className={`h-4 w-4 ${inZone ? "text-warning" : "text-muted-foreground"}`} />
              <span className="text-xs font-bold uppercase tracking-wider">{inZone ? `KILL ZONE — ${kind?.toUpperCase()} BEEP` : "No active alert"}</span>
            </div>
            {inZone && <span className="tag bg-warning/20 text-warning border border-warning/40">{hits.length} HIT</span>}
          </div>
          {inZone && (
            <ul className="mt-2 space-y-1">
              {hits.map((h) => (
                <li key={h} className="mono text-xs text-warning">• {h}</li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card title="Watch Overview" subtitle="All assets at a glance">
        <div className="space-y-1.5">
          {WATCH_SYMBOLS.map((s) => {
            const ws = watches[s] ?? DEFAULT_WATCH[s];
            const { hits: h, kind: k } = evaluateHits(ws);
            const aa = findAsset(s);
            return (
              <button key={s} onClick={() => setActiveSym(s)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md border ${k ? "border-warning bg-warning/10" : "border-border bg-surface-2"}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-16 text-left">{s}</span>
                  <span className="mono text-xs text-muted-foreground">{ws.current ? fmt(parseFloat(ws.current), aa?.decimals ?? 2) : "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {k ? <span className={`tag ${k === "triple" ? "bg-danger text-destructive-foreground" : k === "double" ? "bg-warning/30 text-warning border border-warning/50" : "bg-accent/20 text-accent border border-accent/40"}`}>{k}</span>
                    : <span className="tag bg-muted text-muted-foreground">idle</span>}
                  <span className="mono text-[10px] text-muted-foreground">{h.length} hit</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Alert Log" subtitle={`${log.length} fired`} action={
        log.length > 0 ? <button onClick={() => setLog([])} className="text-[11px] text-danger inline-flex items-center gap-1"><Trash2 className="h-3 w-3" />Clear</button> : null
      }>
        {log.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">No alerts yet. Update a current price to trigger.</div>
        ) : (
          <ul className="divide-y divide-border -mx-3">
            {log.map((a) => {
              const aa = findAsset(a.symbol);
              const d = new Date(a.ts);
              return (
                <li key={a.id} className="px-3 py-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{a.symbol}</span>
                      <span className="mono text-xs text-foreground">{fmt(a.price, aa?.decimals ?? 2)}</span>
                      <span className={`tag ${a.kind === "triple" ? "bg-danger text-destructive-foreground" : a.kind === "double" ? "bg-warning/30 text-warning border border-warning/50" : "bg-accent/20 text-accent border border-accent/40"}`}>{a.kind}</span>
                    </div>
                    <div className="mono text-[11px] text-muted-foreground mt-0.5 truncate">{a.hits.join(" · ")}</div>
                  </div>
                  <div className="mono text-[10px] text-muted-foreground shrink-0">{d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {checklist.open && checklist.alert && (
        <div className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-sm grid place-items-end sm:place-items-center px-2 py-3" role="dialog">
          <div className="w-full max-w-md rounded-lg border border-warning bg-surface p-4 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-warning">Pre-Trade Checklist</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {checklist.alert.symbol} @ <span className="mono">{fmt(checklist.alert.price, findAsset(checklist.alert.symbol)?.decimals ?? 2)}</span> · {checklist.alert.hits.length} confluence
                </p>
              </div>
              <button onClick={() => setChecklist({ ...checklist, open: false })} className="h-8 w-8 grid place-items-center rounded-md border border-border" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {CHECKLIST_QUESTIONS.map((q, i) => {
                const ticked = checklist.ticks[i];
                return (
                  <li key={i}>
                    <button
                      onClick={() => {
                        const next = [...checklist.ticks];
                        next[i] = !next[i];
                        setChecklist({ ...checklist, ticks: next });
                      }}
                      className={`w-full flex items-start gap-2 text-left p-2 rounded-md border ${ticked ? "border-success bg-success/10" : "border-border bg-surface-2"}`}>
                      <span className={`h-5 w-5 shrink-0 rounded grid place-items-center border ${ticked ? "bg-success border-success" : "border-muted-foreground"}`}>
                        {ticked && <Check className="h-3.5 w-3.5 text-background" />}
                      </span>
                      <span className="text-xs leading-snug">{q}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setChecklist({ ...checklist, open: false })} className="flex-1 h-10 rounded-md border border-border text-xs font-semibold uppercase">Skip</button>
              <button
                disabled={!allTicked}
                onClick={() => setChecklist({ ...checklist, open: false })}
                className={`flex-1 h-10 rounded-md text-xs font-bold uppercase ${allTicked ? "bg-success text-background" : "bg-muted text-muted-foreground"}`}>
                {allTicked ? "Take Trade" : `${checklist.ticks.filter(Boolean).length}/${CHECKLIST_QUESTIONS.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
