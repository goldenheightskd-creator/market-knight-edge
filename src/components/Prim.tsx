import type { ReactNode } from "react";

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pt-2">
      <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, title, subtitle, action }: { children: ReactNode; title?: string; subtitle?: string; action?: ReactNode }) {
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
