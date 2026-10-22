import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { reapplyRules } from "@/lib/sync";

/**
 * Enregistre le classement d'une opération (et crée une règle si demandé).
 * Route API plutôt que Server Action : une page restée ouverte dans la PWA
 * continue de fonctionner après un redéploiement.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const body = (await req.json()) as {
    categoryId: number | null;
    rule?: boolean;
    pattern?: string;
    note?: string;
    excluded?: boolean;
  };

  const updated = await db
    .update(schema.transactions)
    .set({
      categoryId: body.categoryId,
      categoryLocked: body.categoryId !== null,
      note: body.note?.trim() || null,
      excluded: Boolean(body.excluded),
    })
    .where(eq(schema.transactions.id, id))
    .returning({ id: schema.transactions.id });
  if (updated.length === 0) return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });

  let reclassified = 0;
  const pattern = body.pattern?.trim();
  if (body.rule && body.categoryId && pattern) {
    await db.insert(schema.rules).values({ pattern, categoryId: body.categoryId });
    reclassified = await reapplyRules();
  }
  return NextResponse.json({ ok: true, reclassified });
}
