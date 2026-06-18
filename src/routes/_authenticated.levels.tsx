import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GROUPS, assetsByGroup, findAsset, type AssetGroup } from "@/lib/assets";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { fmt } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/levels")({
  head: () => ({
    meta: [
      { title: "Level Calculator — Market.knight" },
      { name: "description", content: "Generate sorted level maps with round numbers, PDH/PDL/PWH/PWL, kill zones and auto buy/sell setups." },
      { property: "og:title", content: "Level Calculator — Market.knight" },
      { property: "og:description", content: "Generate sorted level maps with round numbers, PDH/PDL/PWH/PWL, kill zones and auto buy/sell setups." },
      { property: "og:url", content: "https://market-knight-edge.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://market-knight-edge.lovable.app/" }],
  }),
  component: LevelsPage,
});

type Strength = "MEGA" | "STRONG" | "MINOR";
interface Level {
  price: number;
  label: string;
  strength: Strength;
  tags: string[];
  killZone: boolean;
}

function classify(price: number, step: number): { strength: Strength; tags: string[] } {
  const tags: string[] = [];
  let strength: Strength = "MINOR";
  const big = step * 4;
  const mid = step * 2;
  if (Math.abs(price % big) < 1e-6) { strength = "MEGA"; tags.push("Big Round"); }
  else if (Math.abs(price % mid) < 1e-6) { strength = "STRONG"; tags.push("Mid Round"); }
  else if (Math.abs(price % step) < 1e-6) { strength = "MINOR"; tags.push("Round"); }
  return { strength, tags };
}

function generateLevels(price: number, step: number, range: number): number[] {
  const out: number[] = [];
  const lo = price - range;
  const hi = price + range;
  const start = Math.floor(lo / step) * step;
  for (let p = start; p <= hi + 1e-9; p += step) {
    out.push(parseFloat(p.toFixed(8)));
  }
  return out;
}

export default function LevelsPage() {
  const [group, setGroup] = useLocalStorage<AssetGroup>("lvl.group", "Futures");
  const list = assetsByGroup(group);
  const [symbol, setSymbol] = useLocalStorage<string>("lvl.sym", list[0]?.symbol ?? "MES");
  const asset = findAsset(symbol) ?? list[0];

  const [price, setPrice] = useState<string>("");
  const [pdh, setPdh] = useState<string>("");
  const [pdl, setPdl] = useState<string>("");
  const [pwh, setPwh] = useState<string>("");
  const [pwl, setPwl] = useState<string>("");

  const cp = parseFloat(price);
  const dec = asset?.decimals ?? 2;
  const step = asset?.roundStep ?? 1;

  const levels = useMemo<Level[]>(() => {
    if (!isFinite(cp) || !asset) return [];
    const range = step * 20;
    const map = new Map<number, Level>();
    for (const p of generateLevels(cp, step, range)) {
      const c = classify(p, step);
      const dist = Math.abs(p - cp);
      const killZone = dist > 0 && dist < step * 0.4;
      map.set(p, { price: p, label: `${fmt(p, dec)}`, strength: c.strength, tags: c.tags, killZone });
    }
    const addKey = (val: number, tag: string) => {
      if (!isFinite(val)) return;
      const k = parseFloat(val.toFixed(8));
      const existing = map.get(k);
      if (existing) {
        existing.tags.push(tag);
        existing.strength = "MEGA";
      } else {
        map.set(k, { price: k, label: fmt(k, dec), strength: "MEGA", tags: [tag], killZone: false });
      }
    };
    addKey(parseFloat(pdh), "PDH");
    addKey(parseFloat(pdl), "PDL");
    addKey(parseFloat(pwh), "PWH");
    addKey(parseFloat(pwl), "PWL");
    return Array.from(map.values()).sort((a, b) => b.price - a.price);
  }, [cp, step, dec, pdh, pdl, pwh, pwl, asset]);

  const setups = useMemo(() => {
    if (!isFinite(cp) || levels.length === 0) return [];
    const above = levels.filter((l) => l.price > cp && (l.strength === "MEGA" || l.strength === "STRONG"));
    const below = levels.filter((l) => l.price < cp && (l.strength === "MEGA" || l.strength === "STRONG"));
    const sellRes = above[above.length - 1]; // nearest strong above
    const sellTgt = below[0]; // nearest strong below
    const sellSL = above[above.length - 2] ?? (sellRes ? { price: sellRes.price + step } : undefined);
    const buySup = below[0];
    const buyTgt = above[above.length - 1];
    const buySL = below[1] ?? (buySup ? { price: buySup.price - step } : undefined);
    const out: Array<{ dir: "BUY" | "SELL"; entry: number; sl: number; tp: number; rr: number }> = [];
    if (buySup && buyTgt && buySL) {
      const entry = buySup.price, sl = buySL.price, tp = buyTgt.price;
      const r = Math.abs(entry - sl), reward = Math.abs(tp - entry);
      out.push({ dir: "BUY", entry, sl, tp, rr: r ? reward / r : 0 });
    }
    if (sellRes && sellTgt && sellSL) {
      const entry = sellRes.price, sl = sellSL.price, tp = sellTgt.price;
      const r = Math.abs(sl - entry), reward = Math.abs(entry - tp);
      out.push({ dir: "SELL", entry, sl, tp, rr: r ? reward / r : 0 });
    }
    return out;
  }, [cp, levels, step]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Level Calculator" subtitle="Build a sorted level map with round numbers + key highs/lows." />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Asset Group" value={group} onChange={(v) => { setGroup(v as AssetGroup); const first = assetsByGroup(v as AssetGroup)[0]; if (first) setSymbol(first.symbol); }}
            options={GROUPS.map((g) => ({ value: g, label: g }))} />
          <Select label="Asset" value={symbol} onChange={setSymbol}
            options={list.map((a) => ({ value: a.symbol, label: `${a.symbol} — ${a.name}` }))} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NumInput label="Current Price" value={price} onChange={setPrice} dec={dec} />
          <div />
          <NumInput label="PDH" value={pdh} onChange={setPdh} dec={dec} />
          <NumInput label="PDL" value={pdl} onChange={setPdl} dec={dec} />
          <NumInput label="PWH" value={pwh} onChange={setPwh} dec={dec} />
          <NumInput label="PWL" value={pwl} onChange={setPwl} dec={dec} />
        </div>
      </Card>

      {!isFinite(cp) && (
        <Card><div className="text-sm text-muted-foreground text-center py-6">Enter current price to generate levels.</div></Card>
      )}

      {isFinite(cp) && (
        <>
          <Card title="Level Map" subtitle={`Step ${step} · ${levels.length} levels`}>
            <div className="divide-y divide-border -mx-3">
              {levels.map((l) => {
                const dist = l.price - cp;
                const above = dist > 0;
                const strColor = l.strength === "MEGA" ? "bg-accent text-accent-foreground" : l.strength === "STRONG" ? "bg-warning/20 text-warning border border-warning/40" : "bg-muted text-muted-foreground";
                return (
                  <div key={l.price} className={`flex items-center justify-between px-3 py-2 ${l.killZone ? "bg-destructive/15" : ""}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`tag ${strColor}`}>{l.strength}</span>
                      <span className="mono text-sm font-semibold">{l.label}</span>
                      {l.killZone && <span className="tag bg-destructive text-destructive-foreground">KILL</span>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {l.tags.map((t) => <span key={t} className="tag bg-surface-2 text-foreground/80 border border-border">{t}</span>)}
                      <span className={`mono text-xs ${above ? "text-success" : dist < 0 ? "text-danger" : "text-muted-foreground"}`}>
                        {above ? "+" : ""}{fmt(dist, dec)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Auto Setups" subtitle="Entry · Stop · Target · R:R">
            <div className="space-y-2">
              {setups.length === 0 && <div className="text-sm text-muted-foreground">No strong levels nearby.</div>}
              {setups.map((s) => (
                <div key={s.dir} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`tag ${s.dir === "BUY" ? "bg-success/20 text-success border border-success/40" : "bg-danger/20 text-danger border border-danger/40"}`}>{s.dir}</span>
                    <span className="mono text-xs text-muted-foreground">R:R <span className={s.rr >= 2 ? "text-success" : "text-warning"}>{fmt(s.rr, 2)}</span></span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Cell label="Entry" value={fmt(s.entry, dec)} />
                    <Cell label="Stop"  value={fmt(s.sl, dec)} tone="danger" />
                    <Cell label="Target" value={fmt(s.tp, dec)} tone="success" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, title, subtitle, action }: { children: React.ReactNode; title?: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface p-3">
      {(title || action) && (
        <header className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">{title}</h2>}
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function NumInput({ label, value, onChange, dec = 2, placeholder }: { label: string; value: string; onChange: (v: string) => void; dec?: number; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        inputMode="decimal"
        type="text"
        value={value}
        placeholder={placeholder ?? `0.${"0".repeat(Math.min(dec, 4))}`}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.\-]/g, ""))}
        className="mono h-10 rounded-md bg-background border border-input px-2 text-sm focus:border-accent focus:outline-none"
      />
    </label>
  );
}

export function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md bg-background border border-input px-2 text-sm focus:border-accent focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Cell({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" | "warning" }) {
  const c = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-md bg-surface-2 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mono text-sm font-semibold ${c}`}>{value}</div>
    </div>
  );
}
