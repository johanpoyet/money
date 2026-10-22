import { createHash } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { decrypt } from "./crypto";
import { cleanLabel, matchRule } from "./categorize";
import * as eb from "./enablebanking";

const { accounts, bankSessions, rules, syncRuns, transactions } = schema;

/** Nombre de jours relus à chaque synchro, pour rattraper les opérations « en cours » devenues définitives. */
const OVERLAP_DAYS = 7;
const FIRST_SYNC_DAYS = 90;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function labelOf(t: eb.EbTransaction): string {
  const info = (t.remittance_information ?? []).join(" ").trim();
  const party = t.credit_debit_indicator === "DBIT" ? t.creditor?.name : t.debtor?.name;
  return (info || party || "Opération").replace(/\s+/g, " ");
}

function externalIdOf(t: eb.EbTransaction, raw: string, date: string): string {
  if (t.entry_reference) return t.entry_reference;
  if (t.transaction_id) return t.transaction_id;
  return "h:" + createHash("sha256").update(`${date}|${t.transaction_amount.amount}|${t.credit_debit_indicator}|${raw}`).digest("hex").slice(0, 32);
}

export async function runSync(): Promise<{ inserted: number }> {
  const [run] = await db.insert(syncRuns).values({}).returning();
  try {
    const [session] = await db
      .select()
      .from(bankSessions)
      .where(eq(bankSessions.active, true))
      .orderBy(desc(bankSessions.createdAt))
      .limit(1);
    if (!session) throw new Error("Aucune banque connectée");
    if (session.validUntil < new Date()) throw new Error("Accès bancaire expiré : reconnecte ta banque");

    const sessionId = decrypt(session.sessionIdEnc);
    const remote = await eb.getSession(sessionId);
    const allRules = await db.select().from(rules);
    let inserted = 0;

    for (const uid of remote.accounts) {
      const details = await eb.getAccountDetails(uid).catch(() => ({ uid }) as eb.EbAccount);
      const balances = await eb.getBalances(uid);
      const bal =
        balances.balances.find((b) => ["CLBD", "ITBD", "ITAV", "XPCD"].includes(b.balance_type)) ??
        balances.balances[0];

      const [account] = await db
        .insert(accounts)
        .values({
          externalId: uid,
          name: details.name ?? "Compte",
          iban: details.account_id?.iban ?? null,
          currency: bal?.balance_amount.currency ?? "EUR",
          balance: bal?.balance_amount.amount ?? null,
          balanceAt: new Date(),
        })
        .onConflictDoUpdate({
          target: accounts.externalId,
          set: { balance: bal?.balance_amount.amount ?? null, balanceAt: new Date() },
        })
        .returning();

      const [last] = await db
        .select({ d: sql<string>`max(${transactions.bookingDate})` })
        .from(transactions)
        .where(eq(transactions.accountId, account.id));
      const from = last?.d
        ? new Date(new Date(last.d).getTime() - OVERLAP_DAYS * 86400_000)
        : new Date(Date.now() - FIRST_SYNC_DAYS * 86400_000);

      for (const t of await eb.getTransactions(uid, isoDate(from))) {
        const raw = labelOf(t);
        const date = t.booking_date ?? t.value_date ?? t.transaction_date ?? isoDate(new Date());
        const sign = t.credit_debit_indicator === "DBIT" ? -1 : 1;
        const amount = sign * Math.abs(Number(t.transaction_amount.amount));
        const rule = matchRule(raw, amount, allRules);

        const res = await db
          .insert(transactions)
          .values({
            accountId: account.id,
            externalId: externalIdOf(t, raw, date),
            bookingDate: date,
            amount: amount.toFixed(2),
            currency: t.transaction_amount.currency,
            rawLabel: raw,
            label: cleanLabel(raw),
            status: t.status ?? "BOOK",
            categoryId: rule?.categoryId ?? null,
            yearly: rule?.yearly ?? false,
          })
          .onConflictDoUpdate({
            target: [transactions.accountId, transactions.externalId],
            set: { status: t.status ?? "BOOK", amount: amount.toFixed(2), bookingDate: date },
          })
          .returning({ created: sql<boolean>`(xmax = 0)` });
        if (res[0]?.created) inserted++;
      }
    }

    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), ok: true, inserted })
      .where(eq(syncRuns.id, run.id));
    return { inserted };
  } catch (e) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), ok: false, error: String(e) })
      .where(eq(syncRuns.id, run.id));
    throw e;
  }
}

/** Réapplique les règles aux opérations non classées et non verrouillées (après création d'une règle). */
export async function reapplyRules(): Promise<number> {
  const allRules = await db.select().from(rules);
  const pending = await db
    .select()
    .from(transactions)
    .where(and(isNull(transactions.categoryId), eq(transactions.categoryLocked, false)));
  let n = 0;
  for (const t of pending) {
    const rule = matchRule(t.rawLabel, Number(t.amount), allRules);
    if (!rule) continue;
    await db
      .update(transactions)
      .set({ categoryId: rule.categoryId, yearly: rule.yearly })
      .where(eq(transactions.id, t.id));
    n++;
  }
  return n;
}
