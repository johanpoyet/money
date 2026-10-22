import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBadge } from "@/components/ui";
import { db, schema } from "@/db";
import { eurosCents } from "@/lib/format";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

/** Motif proposé pour une règle : le libellé sans préfixe bancaire ni date ni numéro de carte, limité à 3 mots. */
function suggestPattern(raw: string) {
  return raw
    .toUpperCase()
    .replace(/^(CB|PRLV( SEPA)?|VIR( INST| SEPA)?|\*)\s*/, "")
    .replace(/\s+FACT\s+\d{6}.*$/, "")
    .replace(/\d{4,}\**\d*/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tx] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, Number(id)));
  if (!tx) notFound();
  const cats = await db
    .select({ id: schema.categories.id, name: schema.categories.name, group: schema.categories.group })
    .from(schema.categories)
    .orderBy(asc(schema.categories.group), asc(schema.categories.name));
  const current = cats.find((c) => c.id === tx.categoryId);
  const amount = Number(tx.amount);

  return (
    <main className="mx-auto flex max-w-[480px] flex-col gap-5 px-5" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
      <Link href="/operations" className="flex h-11 items-center gap-1.5 self-start text-[15px] font-semibold">
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Opérations
      </Link>

      <div className="flex flex-col items-center gap-2.5 text-center">
        <CategoryBadge name={current?.name ?? null} group={current?.group ?? null} />
        <span className={`num text-[40px] ${amount > 0 ? "text-plus" : ""}`}>
          {amount > 0 ? "+" : "−"}
          {eurosCents(Math.abs(amount))}
        </span>
        <span className="text-[17px] font-bold">{tx.label}</span>
        <span className="text-[13px] text-muted">
          {new Date(`${tx.bookingDate}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          {tx.status === "PDNG" ? " · en cours" : ""}
        </span>
      </div>

      <div className="flex justify-between gap-3 rounded-[18px] bg-surface px-4 py-3.5 text-[13px]">
        <span className="shrink-0 text-muted">Libellé banque</span>
        <span className="num truncate">{tx.rawLabel}</span>
      </div>

      <EditForm
        id={tx.id}
        categoryId={tx.categoryId}
        categories={cats}
        suggestedPattern={suggestPattern(tx.rawLabel)}
        note={tx.note ?? ""}
        excluded={tx.excluded}
      />
    </main>
  );
}
