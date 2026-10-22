import { GROUP_LABEL, dayLabel, signed } from "@/lib/format";

type GroupKey = "fixe" | "courant" | "plaisir" | "hors";

const GROUP_STYLE: Record<GroupKey, { fg: string; bg: string }> = {
  fixe: { fg: "text-fixe", bg: "bg-fixe-soft" },
  courant: { fg: "text-courant", bg: "bg-courant-soft" },
  plaisir: { fg: "text-plaisir", bg: "bg-plaisir-soft" },
  hors: { fg: "text-plus", bg: "bg-plus-soft" },
};

/** Anneau de répartition fixes / courant / plaisirs. */
export function Ring({ fixe, courant, plaisir, total }: { fixe: number; courant: number; plaisir: number; total: number }) {
  const safe = total || 1;
  const a = (fixe / safe) * 100;
  const b = a + (courant / safe) * 100;
  const bg = total
    ? `conic-gradient(var(--color-fixe) 0 ${a}%, var(--color-courant) ${a}% ${b}%, var(--color-plaisir) ${b}% 100%)`
    : "var(--color-line)";
  return (
    <div className="flex size-[132px] shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
      <div className="flex size-[100px] flex-col items-center justify-center gap-0.5 rounded-full bg-surface">
        <span className="text-[11px] text-muted">Dépensé</span>
        <span className="num text-[17px]">{Math.round(total).toLocaleString("fr-FR")} €</span>
      </div>
    </div>
  );
}

export function Gauge({ spent, budget, group }: { spent: number; budget: number; group: GroupKey }) {
  const over = spent > budget;
  const pct = Math.min(100, (spent / (budget || 1)) * 100);
  const color = over ? "bg-over" : { fixe: "bg-fixe", courant: "bg-courant", plaisir: "bg-plaisir", hors: "bg-plus" }[group];
  return (
    <div className="h-1.5 rounded-full bg-line">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function CategoryBadge({ name, group }: { name: string | null; group: GroupKey | null }) {
  if (!name || !group) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#4a5068] text-sm font-extrabold text-muted">
        ?
      </span>
    );
  }
  const s = GROUP_STYLE[group];
  return (
    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${s.bg} ${s.fg}`}>
      {name.slice(0, 2) === "Co" ? "Co" : name[0]}
    </span>
  );
}

export function TxRow(t: {
  label: string;
  amount: string | number;
  date: string;
  categoryName: string | null;
  group: GroupKey | null;
  status?: string;
  showDate?: boolean;
}) {
  const amount = Number(t.amount);
  return (
    <div className="flex items-center gap-3">
      <CategoryBadge name={t.categoryName} group={t.group} />
      <div className="flex min-w-0 grow flex-col">
        <span className="truncate text-sm font-semibold">{t.label}</span>
        <span className={`text-xs ${t.categoryName ? "text-muted" : "text-courant"}`}>
          {t.categoryName ?? "À classer"}
          {t.showDate !== false ? ` · ${dayLabel(t.date)}` : ""}
          {t.status === "PDNG" ? " · en cours" : ""}
        </span>
      </div>
      <span className={`num text-sm ${amount > 0 ? "text-plus" : ""}`}>{signed(amount)}</span>
    </div>
  );
}

export function Legend({ group, value }: { group: "fixe" | "courant" | "plaisir"; value: string }) {
  const dot = { fixe: "bg-fixe", courant: "bg-courant", plaisir: "bg-plaisir" }[group];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-[13px]">
        <span className={`size-2 rounded-full ${dot}`} />
        {GROUP_LABEL[group]}
      </span>
      <span className="num text-sm">{value}</span>
    </div>
  );
}
