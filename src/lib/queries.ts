import { and, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { accounts, categories, syncRuns, transactions } = schema;

export type Group = "fixe" | "courant" | "plaisir";

/** Premier jour du mois (YYYY-MM-01) et du mois suivant. */
export function monthBounds(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  const yearAgo = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 11, 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), yearAgo: iso(yearAgo) };
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Dépenses du mois par catégorie (montants positifs).
 * Un paiement annuel compte pour 1/12 dans chacun des 12 mois qui suivent son paiement.
 */
export async function spendingByCategory(month: string) {
  const { start, end, yearAgo } = monthBounds(month);
  const effective = sql<string>`sum(case when ${transactions.yearly} then -${transactions.amount} / 12 else -${transactions.amount} end)`;
  return db
    .select({
      categoryId: categories.id,
      name: categories.name,
      group: categories.group,
      budget: categories.monthlyBudget,
      spent: effective,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.excluded, false),
        eq(categories.excluded, false),
        sql`${categories.group} <> 'hors'`,
        sql`(
          (not ${transactions.yearly} and ${transactions.bookingDate} >= ${start} and ${transactions.bookingDate} < ${end})
          or (${transactions.yearly} and ${transactions.bookingDate} >= ${yearAgo} and ${transactions.bookingDate} < ${end})
        )`,
      ),
    )
    .groupBy(categories.id)
    .orderBy(desc(effective));
}

export async function groupTotals(month: string) {
  const rows = await spendingByCategory(month);
  const totals: Record<Group, number> = { fixe: 0, courant: 0, plaisir: 0 };
  for (const r of rows) totals[r.group as Group] += Number(r.spent);
  return { totals, total: totals.fixe + totals.courant + totals.plaisir, rows };
}

export async function totalBalance() {
  const [r] = await db.select({ b: sql<string>`coalesce(sum(${accounts.balance}), 0)` }).from(accounts);
  return Number(r?.b ?? 0);
}

export async function uncategorizedCount(month: string) {
  const { start, end } = monthBounds(month);
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        isNull(transactions.categoryId),
        eq(transactions.excluded, false),
        gte(transactions.bookingDate, start),
        lt(transactions.bookingDate, end),
      ),
    );
  return r?.n ?? 0;
}

export async function recentTransactions(limit = 30, month?: string) {
  const where = month
    ? and(gte(transactions.bookingDate, monthBounds(month).start), lt(transactions.bookingDate, monthBounds(month).end))
    : undefined;
  return db
    .select({
      id: transactions.id,
      date: transactions.bookingDate,
      label: transactions.label,
      amount: transactions.amount,
      status: transactions.status,
      categoryName: categories.name,
      group: categories.group,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(where)
    .orderBy(desc(transactions.bookingDate), desc(transactions.id))
    .limit(limit);
}

export async function lastSync() {
  const [r] = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1);
  return r;
}
