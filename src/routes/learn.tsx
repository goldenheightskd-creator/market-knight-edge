import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, SectionHeader } from "./index";
import { useLocalStorage } from "@/lib/useLocalStorage";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Market.knight" },
      { name: "description", content: "8 interactive candlestick examples teaching trend, BOS, CHOCH and FVG — with a quiz." },
      { property: "og:title", content: "Learn — Market.knight" },
      { property: "og:description", content: "8 interactive candlestick examples teaching trend, BOS, CHOCH and FVG — with a quiz." },
      { property: "og:url", content: "https://market-knight-edge.lovable.app/learn" },
    ],
    links: [{ rel: "canonical", href: "https://market-knight-edge.lovable.app/learn" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Read SMC Candlestick Patterns",
        "description": "Learn to identify trend, BOS, CHOCH, and FVG through interactive candlestick examples.",
        "totalTime": "PT15M",
        "step": [
          {
            "@type": "HowToStep",
            "name": "Identify Uptrend and Downtrend",
            "text": "Learn to spot higher highs + higher lows (uptrend) and lower highs + lower lows (downtrend)."
          },
          {
            "@type": "HowToStep",
            "name": "Recognize Break of Structure (BOS)",
            "text": "Identify when price breaks the last swing high or low in the direction of the trend."
          },
          {
            "@type": "HowToStep",
            "name": "Spot Change of Character (CHOCH)",
            "text": "Detect the first counter-trend break that signals a potential reversal."
          },
          {
            "@type": "HowToStep",
            "name": "Find Fair Value Gaps (FVG)",
            "text": "Locate 3-candle imbalances that act as magnets for price to return and fill."
          }
        ]
      }),
    }],
  }),
  component: LearnPage,
});

type Concept = "TREND" | "BOS" | "CHOCH" | "FVG";
interface Candle { o: number; h: number; l: number; c: number; label?: string; mark?: "swing-high" | "swing-low"; }
interface Annotation { x: number; y: number; text: string; color?: string; }
interface Chart {
  id: string;
  concept: Concept;
  title: string;
  description: string;
  candles: Candle[];
  annotations: Annotation[]; // y is price
  lines?: { y: number; label: string; color: string; dashed?: boolean }[];
  fvgs?: { from: number; to: number; high: number; low: number; bullish: boolean }[];
}

const CHARTS: Chart[] = [
  {
    id: "uptrend",
    concept: "TREND",
    title: "Uptrend (HH + HL)",
    description: "Higher highs and higher lows. Buy the dips into support.",
    candles: [
      { o: 100, h: 104, l: 99, c: 103 },
      { o: 103, h: 108, l: 102, c: 107, mark: "swing-high", label: "HH" },
      { o: 107, h: 108, l: 103, c: 104, mark: "swing-low", label: "HL" },
      { o: 104, h: 112, l: 104, c: 111, mark: "swing-high", label: "HH" },
      { o: 111, h: 112, l: 107, c: 108, mark: "swing-low", label: "HL" },
      { o: 108, h: 116, l: 108, c: 115, mark: "swing-high", label: "HH" },
      { o: 115, h: 116, l: 111, c: 112, mark: "swing-low", label: "HL" },
      { o: 112, h: 120, l: 112, c: 119 },
    ],
    annotations: [],
  },
  {
    id: "downtrend",
    concept: "TREND",
    title: "Downtrend (LH + LL)",
    description: "Lower highs and lower lows. Sell the rallies into resistance.",
    candles: [
      { o: 120, h: 121, l: 116, c: 117 },
      { o: 117, h: 118, l: 112, c: 113, mark: "swing-low", label: "LL" },
      { o: 113, h: 117, l: 112, c: 116, mark: "swing-high", label: "LH" },
      { o: 116, h: 117, l: 108, c: 109, mark: "swing-low", label: "LL" },
      { o: 109, h: 113, l: 108, c: 112, mark: "swing-high", label: "LH" },
      { o: 112, h: 113, l: 104, c: 105, mark: "swing-low", label: "LL" },
      { o: 105, h: 109, l: 104, c: 108, mark: "swing-high", label: "LH" },
      { o: 108, h: 109, l: 100, c: 101 },
    ],
    annotations: [],
  },
  {
    id: "bos-bull",
    concept: "BOS",
    title: "Bullish Break of Structure",
    description: "Price breaks above the last swing high, confirming continuation.",
    candles: [
      { o: 100, h: 105, l: 99, c: 104 },
      { o: 104, h: 108, l: 103, c: 107, mark: "swing-high", label: "HH" },
      { o: 107, h: 108, l: 102, c: 103, mark: "swing-low" },
      { o: 103, h: 107, l: 103, c: 106 },
      { o: 106, h: 112, l: 106, c: 111, label: "BOS ↑" },
      { o: 111, h: 114, l: 109, c: 113 },
    ],
    annotations: [],
    lines: [{ y: 108, label: "Prior High", color: "#ffc800", dashed: true }],
  },
  {
    id: "bos-bear",
    concept: "BOS",
    title: "Bearish Break of Structure",
    description: "Price breaks below the last swing low, confirming continuation down.",
    candles: [
      { o: 115, h: 116, l: 110, c: 111 },
      { o: 111, h: 112, l: 107, c: 108, mark: "swing-low", label: "LL" },
      { o: 108, h: 113, l: 107, c: 112, mark: "swing-high" },
      { o: 112, h: 113, l: 108, c: 109 },
      { o: 109, h: 110, l: 103, c: 104, label: "BOS ↓" },
      { o: 104, h: 106, l: 101, c: 102 },
    ],
    annotations: [],
    lines: [{ y: 107, label: "Prior Low", color: "#ffc800", dashed: true }],
  },
  {
    id: "choch-bull",
    concept: "CHOCH",
    title: "Bullish Change of Character",
    description: "After a downtrend, price breaks the recent lower high — trend likely shifting up.",
    candles: [
      { o: 120, h: 121, l: 115, c: 116 },
      { o: 116, h: 117, l: 110, c: 111, mark: "swing-low", label: "LL" },
      { o: 111, h: 115, l: 110, c: 114, mark: "swing-high", label: "LH" },
      { o: 114, h: 115, l: 108, c: 109, mark: "swing-low" },
      { o: 109, h: 117, l: 109, c: 116, label: "CHOCH ↑" },
      { o: 116, h: 120, l: 115, c: 119 },
    ],
    annotations: [],
    lines: [{ y: 115, label: "Last LH", color: "#00c8f0", dashed: true }],
  },
  {
    id: "choch-bear",
    concept: "CHOCH",
    title: "Bearish Change of Character",
    description: "After an uptrend, price breaks the recent higher low — trend likely shifting down.",
    candles: [
      { o: 100, h: 105, l: 99, c: 104 },
      { o: 104, h: 110, l: 104, c: 109, mark: "swing-high", label: "HH" },
      { o: 109, h: 110, l: 105, c: 106, mark: "swing-low", label: "HL" },
      { o: 106, h: 111, l: 105, c: 110, mark: "swing-high" },
      { o: 110, h: 111, l: 103, c: 104, label: "CHOCH ↓" },
      { o: 104, h: 105, l: 100, c: 101 },
    ],
    annotations: [],
    lines: [{ y: 105, label: "Last HL", color: "#ff3355", dashed: true }],
  },
  {
    id: "fvg-bull",
    concept: "FVG",
    title: "Bullish FVG",
    description: "Gap between candle 1 high and candle 3 low — likely magnet for price to fill.",
    candles: [
      { o: 100, h: 103, l: 99, c: 102 },
      { o: 102, h: 110, l: 102, c: 109, label: "Impulse" },
      { o: 109, h: 112, l: 107, c: 111 },
      { o: 111, h: 113, l: 109, c: 110 },
      { o: 110, h: 111, l: 104, c: 105 },
      { o: 105, h: 108, l: 104, c: 107, label: "Fill" },
    ],
    annotations: [],
    fvgs: [{ from: 1, to: 3, high: 107, low: 103, bullish: true }],
  },
  {
    id: "fvg-bear",
    concept: "FVG",
    title: "Bearish FVG",
    description: "Gap between candle 1 low and candle 3 high — likely magnet for price to fill.",
    candles: [
      { o: 115, h: 116, l: 112, c: 113 },
      { o: 113, h: 113, l: 105, c: 106, label: "Impulse" },
      { o: 106, h: 108, l: 103, c: 104 },
      { o: 104, h: 106, l: 102, c: 105 },
      { o: 105, h: 111, l: 104, c: 110 },
      { o: 110, h: 113, l: 108, c: 109, label: "Fill" },
    ],
    annotations: [],
    fvgs: [{ from: 1, to: 3, high: 112, low: 108, bullish: false }],
  },
];

const QUIZ: { q: string; opts: string[]; a: number }[] = [
  { q: "An uptrend is defined by:", opts: ["Lower highs + lower lows", "Higher highs + higher lows", "Equal highs + lows", "Random structure"], a: 1 },
  { q: "A Break of Structure (BOS) confirms:", opts: ["Trend reversal", "Trend continuation", "Liquidity sweep", "Nothing actionable"], a: 1 },
  { q: "A Change of Character (CHOCH) signals:", opts: ["Continuation", "Possible trend reversal", "Sideways range", "FVG fill"], a: 1 },
  { q: "A Fair Value Gap (FVG) tends to act as:", opts: ["Permanent resistance", "A magnet that price often returns to fill", "A trend continuation pattern", "An impulse candle"], a: 1 },
  { q: "Bullish FVG forms when:", opts: ["Candle 3 high is below candle 1 low", "Candle 3 low is above candle 1 high", "Three down candles in a row", "Two doji in a row"], a: 1 },
  { q: "In a downtrend you look for:", opts: ["Higher highs", "Lower highs and lower lows", "Round number support", "Equal highs"], a: 1 },
  { q: "Bullish CHOCH happens after a:", opts: ["Series of HHs and HLs", "Downtrend, when price breaks the last LH", "Liquidity grab on highs", "Bullish FVG fill"], a: 1 },
  { q: "Bearish BOS confirms by:", opts: ["Breaking the last swing high", "Breaking the last swing low", "Filling a bullish FVG", "Equal lows"], a: 1 },
];

function LearnPage() {
  const [filter, setFilter] = useState<"ALL" | Concept>("ALL");
  const shown = filter === "ALL" ? CHARTS : CHARTS.filter((c) => c.concept === filter);

  return (
    <div className="space-y-4">
      <SectionHeader title="Learn" subtitle="Read price. Trust structure. Trade what you see." />

      <Card>
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "TREND", "BOS", "CHOCH", "FVG"] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`tag ${filter === k ? "bg-accent text-accent-foreground" : "bg-surface-2 text-muted-foreground border border-border"}`}>
              {k}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {shown.map((c) => <ChartCard key={c.id} chart={c} />)}
      </div>

      <Quiz />

      <Card title="Cheat Sheet">
        <ul className="space-y-1.5 text-sm">
          <Cheat term="Uptrend" def="Higher highs (HH) + higher lows (HL). Buy dips." />
          <Cheat term="Downtrend" def="Lower highs (LH) + lower lows (LL). Sell rallies." />
          <Cheat term="BOS" def="Break of Structure — break in direction of trend = continuation." />
          <Cheat term="CHOCH" def="Change of Character — first counter-trend break = reversal warning." />
          <Cheat term="FVG" def="Fair Value Gap — 3-candle imbalance, magnet for price to fill." />
          <Cheat term="Liquidity" def="Resting orders at prior highs/lows. Often swept before real move." />
        </ul>
      </Card>
    </div>
  );
}

function Cheat({ term, def }: { term: string; def: string }) {
  return (
    <li className="flex gap-2">
      <span className="mono text-accent font-bold w-20 shrink-0">{term}</span>
      <span className="text-foreground/80">{def}</span>
    </li>
  );
}

function ChartCard({ chart }: { chart: Chart }) {
  const allHi = Math.max(...chart.candles.map((c) => c.h), ...(chart.lines?.map((l) => l.y) ?? []));
  const allLo = Math.min(...chart.candles.map((c) => c.l), ...(chart.lines?.map((l) => l.y) ?? []));
  const pad = (allHi - allLo) * 0.1;
  const hi = allHi + pad, lo = allLo - pad;
  const W = 360, H = 200;
  const n = chart.candles.length;
  const cw = (W - 20) / n;
  const y = (p: number) => 10 + ((hi - p) / (hi - lo)) * (H - 20);

  return (
    <section className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="tag bg-accent/20 text-accent border border-accent/40">{chart.concept}</span>
            <h3 className="font-bold text-sm truncate">{chart.title}</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{chart.description}</p>
        </div>
      </div>
      <div className="overflow-hidden -mx-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* grid */}
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1={10} x2={W - 10} y1={10 + (H - 20) * f} y2={10 + (H - 20) * f} stroke="#1a2238" strokeDasharray="2 4" />
          ))}
          {/* horizontal levels */}
          {chart.lines?.map((l, i) => (
            <g key={i}>
              <line x1={10} x2={W - 10} y1={y(l.y)} y2={y(l.y)} stroke={l.color} strokeDasharray={l.dashed ? "4 4" : undefined} strokeWidth={1} />
              <text x={W - 12} y={y(l.y) - 4} fill={l.color} fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{l.label}</text>
            </g>
          ))}
          {/* fvgs */}
          {chart.fvgs?.map((g, i) => {
            const x = 10 + g.from * cw;
            const w = (g.to - g.from + 1) * cw;
            const color = g.bullish ? "#00e87a" : "#ff3355";
            return (
              <g key={i}>
                <rect x={x} y={y(g.high)} width={W - 10 - x} height={y(g.low) - y(g.high)} fill={color} opacity={0.12} />
                <text x={W - 12} y={y((g.high + g.low) / 2) + 3} fill={color} fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">FVG</text>
              </g>
            );
          })}
          {/* candles */}
          {chart.candles.map((c, i) => {
            const cx = 10 + i * cw + cw / 2;
            const bullish = c.c >= c.o;
            const color = bullish ? "#00e87a" : "#ff3355";
            const bodyTop = y(Math.max(c.o, c.c));
            const bodyBot = y(Math.min(c.o, c.c));
            const bodyH = Math.max(2, bodyBot - bodyTop);
            const bw = cw * 0.6;
            return (
              <g key={i}>
                <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth={1} />
                <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} />
                {c.label && (
                  <text x={cx} y={c.mark === "swing-low" ? y(c.l) + 11 : y(c.h) - 5} fontSize="9" fill="#e7ecf3" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700">{c.label}</text>
                )}
                {c.mark === "swing-high" && <circle cx={cx} cy={y(c.h) - 14} r={2} fill="#ffc800" />}
                {c.mark === "swing-low" && <circle cx={cx} cy={y(c.l) + 18} r={2} fill="#ffc800" />}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function Quiz() {
  const [answers, setAnswers] = useLocalStorage<(number | null)[]>("quiz.ans", Array(QUIZ.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const score = useMemo(() => answers.reduce<number>((a, v, i) => a + (v === QUIZ[i].a ? 1 : 0), 0), [answers]);

  return (
    <Card title="Quiz" subtitle={`${QUIZ.length} questions · ${submitted ? `Score ${score}/${QUIZ.length}` : "Test your knowledge"}`}>
      <ol className="space-y-3">
        {QUIZ.map((q, i) => (
          <li key={i}>
            <div className="text-sm font-semibold mb-1.5">{i + 1}. {q.q}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {q.opts.map((o, j) => {
                const picked = answers[i] === j;
                const correct = q.a === j;
                let cls = "border-border bg-surface-2 text-foreground";
                if (submitted) {
                  if (correct) cls = "border-success/50 bg-success/10 text-success";
                  else if (picked && !correct) cls = "border-danger/50 bg-danger/10 text-danger";
                } else if (picked) cls = "border-accent bg-accent/10 text-accent";
                return (
                  <button key={j} onClick={() => { if (!submitted) { const next = [...answers]; next[i] = j; setAnswers(next); } }}
                    className={`text-left text-sm rounded-md px-3 py-2 border ${cls}`}>{o}</button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setSubmitted(true)} className="h-10 rounded-md bg-accent text-accent-foreground text-sm font-bold uppercase tracking-wider">Submit</button>
        <button onClick={() => { setAnswers(Array(QUIZ.length).fill(null)); setSubmitted(false); }} className="h-10 rounded-md border border-border bg-surface-2 text-sm font-bold uppercase tracking-wider">Reset</button>
      </div>
      {submitted && (
        <div className={`mt-3 rounded-md border p-3 text-center ${score === QUIZ.length ? "border-success/50 bg-success/10 text-success" : score >= QUIZ.length * 0.7 ? "border-warning/50 bg-warning/10 text-warning" : "border-danger/50 bg-danger/10 text-danger"}`}>
          <div className="text-2xl mono font-bold">{score} / {QUIZ.length}</div>
          <div className="text-xs uppercase tracking-wider mt-1">
            {score === QUIZ.length ? "Perfect score" : score >= QUIZ.length * 0.7 ? "Solid — keep going" : "Review and try again"}
          </div>
        </div>
      )}
    </Card>
  );
}
