import Link from "next/link";
import { Screen } from "@/components/nav";
import { Gauge, Legend, Ring, TxRow } from "@/components/ui";
import { euros, eurosCents } from "@/lib/format";
import { currentMonth, groupTotals, lastSync, recentTransactions, totalBalance, uncategorizedCount } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const month = currentMonth();
  const [balance, { totals, total, rows }, toSort, recent, sync] = await Promise.all([
    totalBalance(),
    groupTotals(month),
    uncategorizedCount(month),
    recentTransactions(4),
    lastSync(),
  ]);
  // Postes à surveiller : ceux qui ont un budget, les plus consommés d'abord.
  const watched = rows
    .filter((r) => r.budget !== null && r.group !== "fixe")
    .sort((a, b) => Number(b.spent) / Number(b.budget) - Number(a.spent) / Number(a.budget))
    .slice(0, 2);
  const syncTime = sync?.finishedAt
    ? sync.finishedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })
    : "jamais";

  return (
    <Screen>
      <header className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted">Compte individuel · synchro {syncTime}</span>
          <span className="num text-[28px] font-medium">{eurosCents(balance)}</span>
        </div>
        <span className="flex h-11 items-center rounded-full border border-line bg-surface px-4 text-[13px] font-semibold capitalize">
          {new Date().toLocaleDateString("fr-FR", { month: "short" })}
        </span>
      </header>

      <section className="flex items-center gap-5 rounded-[22px] bg-surface p-[22px]">
        <Ring fixe={totals.fixe} courant={totals.courant} plaisir={totals.plaisir} total={total} />
        <div className="flex min-w-0 grow flex-col gap-3">
          <Legend group="fixe" value={euros(totals.fixe)} />
          <Legend group="courant" value={euros(totals.courant)} />
          <Legend group="plaisir" value={euros(totals.plaisir)} />
        </div>
      </section>

      {toSort > 0 && (
        <Link href="/operations?filtre=a-classer" className="flex items-center gap-3 rounded-[18px] bg-courant-soft px-4 py-3.5">
          <span className="flex size-8 items-center justify-center rounded-[10px] border border-dashed border-courant text-sm font-extrabold text-courant">?</span>
          <span className="grow text-sm font-semibold">
            {toSort} opération{toSort > 1 ? "s" : ""} à classer
          </span>
          <span className="text-sm font-bold text-courant">Classer</span>
        </Link>
      )}

      {watched.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          {watched.map((w) => {
            const spent = Number(w.spent);
            const budget = Number(w.budget);
            return (
              <div key={w.categoryId} className="flex flex-col gap-2.5 rounded-[18px] bg-surface p-4">
                <span className="text-xs text-muted">{w.name}</span>
                <span className={`num text-lg ${spent > budget ? "text-over" : ""}`}>
                  {Math.round(spent)} <span className="text-muted">/ {Math.round(budget)} €</span>
                </span>
                <Gauge spent={spent} budget={budget} group={w.group} />
              </div>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Activité</h2>
          <Link href="/operations" className="text-[13px] font-semibold text-courant">
            Tout voir
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">
            Aucune opération pour l&apos;instant.{" "}
            <Link href="/reglages" className="text-courant">
              Connecte ta banque
            </Link>
            .
          </p>
        ) : (
          recent.map((t) => <TxRow key={t.id} {...t} />)
        )}
      </section>
    </Screen>
  );
}
