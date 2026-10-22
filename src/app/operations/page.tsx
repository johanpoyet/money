import { Screen } from "@/components/nav";
import { TxRow } from "@/components/ui";
import { dayHeader, signed } from "@/lib/format";
import { currentMonth, monthBounds } from "@/lib/queries";
import { db, schema } from "@/db";
import { and, desc, eq, gte, ilike, isNull, lt, type SQL } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "tout", label: "Tout" },
  { key: "fixe", label: "Fixes" },
  { key: "courant", label: "Courant" },
  { key: "plaisir", label: "Plaisirs" },
  { key: "a-classer", label: "À classer" },
] as const;

export default async function Operations({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string }> }) {
  const { filtre = "tout", q = "" } = await searchParams;
  const { start, end } = monthBounds(currentMonth());
  const { transactions: t, categories: c } = schema;

  const conds: SQL[] = [gte(t.bookingDate, start), lt(t.bookingDate, end)];
  if (filtre === "a-classer") conds.push(isNull(t.categoryId));
  else if (filtre === "fixe" || filtre === "courant" || filtre === "plaisir") conds.push(eq(c.group, filtre));
  if (q) conds.push(ilike(t.label, `%${q}%`));

  const rows = await db
    .select({
      id: t.id,
      date: t.bookingDate,
      label: t.label,
      amount: t.amount,
      status: t.status,
      categoryName: c.name,
      group: c.group,
    })
    .from(t)
    .leftJoin(c, eq(t.categoryId, c.id))
    .where(and(...conds))
    .orderBy(desc(t.bookingDate), desc(t.id));

  const days = new Map<string, typeof rows>();
  for (const r of rows) days.set(r.date, [...(days.get(r.date) ?? []), r]);

  return (
    <Screen>
      <header className="flex items-baseline justify-between">
        <h1 className="text-[26px] font-extrabold tracking-tight">Opérations</h1>
        <span className="text-[13px] text-muted">{rows.length}</span>
      </header>

      <form className="flex flex-col gap-3">
        <label htmlFor="q" className="sr-only">
          Rechercher une opération
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un libellé…"
          className="h-12 rounded-2xl border border-line bg-surface px-4 text-[15px] placeholder:text-muted"
        />
        <input type="hidden" name="filtre" value={filtre} />
      </form>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filtre === f.key;
          const params = new URLSearchParams({ filtre: f.key, ...(q ? { q } : {}) });
          return (
            <Link
              key={f.key}
              href={`/operations?${params}`}
              className={`flex h-9 items-center rounded-full px-3.5 text-[13px] ${
                active ? "bg-ink font-bold text-bg" : "border border-line font-semibold"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      {rows.length === 0 && <p className="text-sm text-muted">Aucune opération ce mois-ci pour ce filtre.</p>}

      {[...days.entries()].map(([date, list]) => (
        <section key={date} className="flex flex-col gap-3">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted">
            <span>{dayHeader(date)}</span>
            <span className="num">{signed(list.reduce((s, r) => s + Number(r.amount), 0))}</span>
          </div>
          {list.map((r) => (
            <Link key={r.id} href={`/operations/${r.id}`}>
              <TxRow {...r} showDate={false} />
            </Link>
          ))}
        </section>
      ))}
    </Screen>
  );
}
