import { desc, eq, sql } from "drizzle-orm";
import { Screen } from "@/components/nav";
import { db, schema } from "@/db";
import { lastSync } from "@/lib/queries";
import { SyncButton } from "./sync-button";

export const dynamic = "force-dynamic";

export default async function Reglages({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const sp = await searchParams;
  const [session] = await db
    .select()
    .from(schema.bankSessions)
    .where(eq(schema.bankSessions.active, true))
    .orderBy(desc(schema.bankSessions.createdAt))
    .limit(1);
  const [{ n: ruleCount }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.rules);
  const sync = await lastSync();
  const daysLeft = session ? Math.ceil((session.validUntil.getTime() - Date.now()) / 86400_000) : 0;
  const fmt = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" });

  return (
    <Screen>
      <h1 className="text-[26px] font-extrabold tracking-tight">Réglages</h1>

      {sp.ok && <p className="rounded-[18px] bg-plus-soft px-4 py-3 text-sm text-plus">Banque connectée, première synchro faite.</p>}
      {sp.erreur && <p className="rounded-[18px] bg-[#2a1c22] px-4 py-3 text-sm text-over">La connexion bancaire n&apos;a pas abouti. Réessaie.</p>}

      {session && daysLeft <= 14 && (
        <div className="flex flex-col gap-2.5 rounded-[18px] bg-courant-soft p-4">
          <span className="text-sm font-bold text-courant">Accès bancaire à renouveler dans {daysLeft} jours</span>
          <span className="text-[13px] text-[#d8cdb8]">La banque demande une validation tous les 180 jours. Ça prend 30 secondes dans ton app.</span>
          <a href="/api/bank/connect" className="flex h-10 items-center self-start rounded-[14px] bg-courant px-4 text-[13px] font-bold text-bg">
            Renouveler
          </a>
        </div>
      )}

      <section className="flex flex-col gap-3.5 rounded-[22px] bg-surface p-[18px]">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-[13px] font-extrabold">CE</span>
          <div className="flex grow flex-col">
            <span className="text-[15px] font-bold">{session?.aspspName ?? "Aucune banque"}</span>
            <span className="text-xs text-muted">{session ? "Lecture seule" : "Connecte ta banque pour commencer"}</span>
          </div>
          {session && <span className="rounded-full bg-plus-soft px-2.5 py-1 text-xs font-bold text-plus">Connectée</span>}
        </div>
        {session && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1 rounded-[14px] bg-bg p-3">
              <span className="text-xs text-muted">Dernière synchro</span>
              <span className="num text-sm">{sync?.finishedAt ? fmt(sync.finishedAt) : "—"}</span>
              {sync && sync.ok === false && <span className="text-xs text-over">Échec</span>}
            </div>
            <div className="flex flex-col gap-1 rounded-[14px] bg-bg p-3">
              <span className="text-xs text-muted">Accès valide jusqu&apos;au</span>
              <span className="num text-sm">{session.validUntil.toLocaleDateString("fr-FR")}</span>
            </div>
          </div>
        )}
        {session ? (
          <SyncButton />
        ) : (
          <a href="/api/bank/connect" className="flex h-14 items-center justify-center rounded-[18px] bg-ink text-base font-bold text-bg">
            Connecter ma banque
          </a>
        )}
      </section>

      <section className="flex flex-col rounded-[22px] bg-surface">
        <div className="flex min-h-[52px] items-center justify-between px-4 text-[15px] font-semibold">
          <span>Règles de classement</span>
          <span className="text-[13px] text-muted">{ruleCount}</span>
        </div>
      </section>

      <form action="/api/logout" method="post">
        <button className="h-12 w-full rounded-2xl border border-line bg-surface text-sm font-semibold">Se déconnecter</button>
      </form>
    </Screen>
  );
}
