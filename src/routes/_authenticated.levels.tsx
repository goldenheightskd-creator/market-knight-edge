import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { GROUPS, assetsByGroup, findAsset, type AssetGroup } from "@/lib/assets";
import { Card, Cell, NumInput, Select, SectionHeader } from "@/components/Prim";
import { fmt } from "@/lib/format";
import { useAuthSession, usePrefs, useSavePrefs, useSaveLevels, useUpdateChecklist } from "@/lib/cloud";

export const Route = createFileRoute("/_authenticated/levels")({
  head: () => ({
    meta: [
      { title: "Level Calculator — Market.knight" },
      { name: "description", content: "Generate sorted level maps with round numbers, PDH/PDL/PWH/PWL, kill zones and auto buy/sell setups." },
      { property: "og:title", content: "Level Calculator — Market.knight" },
      { property: "og:description", content: "Generate sorted level maps with round numbers, PDH/PDL/PWH/PWL, kill zones and auto buy/sell setups." },
    ],
  }),
  component: LevelsPage,
});

type Strength = "MEGA" | "STRONG" | "MINOR";
interface Level { price: number; label: string; strength: Strength; tags: string[]; killZone: boolean; }

function classify(price: number, step: number): { strength: Strength; tags: string[] } {
  const tags: string[] = [];
  let strength: Strength = "MINOR";
  const big = step * 4, mid = step * 2;
  if (Math.abs(price % big) < 1e-6) { strength = "MEGA"; tags.push("Big Round"); }
  else if (Math.abs(price % mid) < 1e-6) { strength = "STRONG"; tags.push("Mid Round"); }
  else if (Math.abs(price % step) < 1e-6) { strength = "MINOR"; tags.push("Round"); }
  return { strength, tags };
}

function generateLevels(price: number, step: number, range: number): number[] {
  const out: number[] = [];
  const lo = price - range, hi = price + range;
  const start = Math.floor(lo / step) * step;
  for (let p = start; p <= hi + 1e-9; p += step) out.push(parseFloat(p.toFixed(8)));
  return out;
}

function LevelsPage() {
  const { user } = useAuthSession();
  const { data: prefs } = usePrefs(user?.id);
  const savePrefs = useSavePrefs(user?.id);
  const saveLevels = useSaveLevels(user?.id);
  const updateChecklist = useUpdateChecklist(user?.id);

  const initialAsset = prefs?.current_asset ?? "MES";
  const initialGroup = (findAsset(initialAsset)?.group ?? "Futures") as AssetGroup;
  const [group, setGroup] = useState<AssetGroup>(initialGroup);
  const [symbol, setSymbol] = useState<string>(initialAsset);

  useEffect(() => {
    if (prefs?.current_asset && prefs.current_asset !== symbol) {
      setSymbol(prefs.current_asset);
      const g = findAsset(prefs.current_asset)?.group;
      if (g) setGroup(g);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs?.current_asset]);

  const list = assetsByGroup(group);
  const asset = findAsset(symbol) ?? list[0];

  const [price, setPrice] = useState("");
  const [pdh, setPdh] = useState("");
  const [pdl, setPdl] = useState("");
  const [pwh, setPwh] = useState("");
  const [pwl, setPwl] = useState("");

  const cp = parseFloat(price);
  const dec = asset?.decimals ?? 2;
  const step = asset?.roundStep ?? 1;

  function chooseAsset(sym: string) {
    setSymbol(sym);
    savePrefs.mutate({ current_asset: sym });
  }

  function saveToCloud() {
    if (!asset) return;
    saveLevels.mutate({
      asset: asset.symbol,
      levels: {
        price: isFinite(cp) ? cp : undefined,
        pdh: isFinite(parseFloat(pdh)) ? parseFloat(pdh) : undefined,
        pdl: isFinite(parseFloat(pdl)) ? parseFloat(pdl) : undefined,
        pwh: isFinite(parseFloat(pwh)) ? parseFloat(pwh) : undefined,
        pwl: isFinite(parseFloat(pwl)) ? parseFloat(pwl) : undefined,
      },
    });
    updateChecklist.mutate({ marked_levels: true });
  }

  const levels = useMemo<Level[]>(() => {
    if (!isFinite(cp) || !asset) return [];
    const range = step * 20;
    const map = new Map<number, Level>();
    for (const p of generateLevels(cp, step, range)) {
      const c = classify(p, step);
      const dist = Math.abs(p - cp);
      const killZone = dist > 0 && dist < step * 0.4;
      map.set(p, { price: p, label: fmt(p, dec), strength: c.strength, tags: c.tags, killZone });
    }
    const addKey = (val: number, tag: string) => {
      if (!isFinite(val)) return;
      const k = parseFloat(val.toFixed(8));
      const existing = map.get(k);
      if (existing) { existing.tags.push(tag); existing.strength = "MEGA"; }
      else map.set(k, { price: k, label: fmt(k, dec), strength: "MEGA", tags: [tag], killZone: false });
    };
    addKey(parseFloat(pdh), "PDH");
    addKey(parseFloat(pdl), "PDL");
    addKey(parseFloat(pwh), "PWH");
    addKey(parseFloat(pwl), "PWL");
    return Array.from(map.values()).sort((a, b) => b.price - a.price);
  }, [cp, step, dec, pdh, pdl, pwh, pwl, asset]);

  return (
    <div className="space-y-4">
      <SectionHeader title="Level Calculator" subtitle="Build a sorted level map · saved to your cloud." />

      <Card>
        <div className="grid grid-cols-2 gap-2">
          <Select label="Asset Group" value={group} onChange={(v) => { setGroup(v as AssetGroup); const first = assetsByGroup(v as AssetGroup)[0]; if (first) chooseAsset(first.symbol); }}
            options={GROUPS.map((g) => ({ value: g, label: g }))} />
          <Select label="Asset" value={symbol} onChange={chooseAsset}
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
        <button
          onClick={saveToCloud}
          disabled={!isFinite(cp) || saveLevels.isPending}
          className="mt-3 w-full h-10 rounded-md bg-accent text-accent-foreground text-sm font-bold uppercase tracking-wider glow-accent disabled:opacity-50"
        >
          {saveLevels.isPending ? "Saving…" : saveLevels.isSuccess ? "✓ Saved — Active in Risk & Alerts" : "Save levels to cloud"}
        </button>
      </Card>

      {!isFinite(cp) && (
        <Card><div className="text-sm text-muted-foreground text-center py-6">Enter current price to generate levels.</div></Card>
      )}

      {isFinite(cp) && (
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
      )}

      <Cell label="Tip" value="Levels sync to Risk Calculator + Alerts." />
    </div>
  );
}
