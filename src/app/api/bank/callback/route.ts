import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";
import { encrypt } from "@/lib/crypto";
import { createSession } from "@/lib/enablebanking";
import { runSync } from "@/lib/sync";

/** Retour de la banque : échange le code contre une session, la chiffre et lance une première synchro. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const back = new URL("/reglages", process.env.APP_URL ?? req.url);

  if (!code || !state || state !== req.cookies.get("eb_state")?.value) {
    back.searchParams.set("erreur", "connexion");
    return NextResponse.redirect(back);
  }

  const session = await createSession(code);
  await db.update(schema.bankSessions).set({ active: false }).where(eq(schema.bankSessions.active, true));
  await db.insert(schema.bankSessions).values({
    aspspName: process.env.ENABLE_BANKING_ASPSP_NAME ?? "Banque",
    sessionIdEnc: encrypt(session.session_id),
    validUntil: new Date(session.access.valid_until),
  });

  await runSync().catch(() => undefined);
  back.searchParams.set("ok", "1");
  const res = NextResponse.redirect(back);
  res.cookies.delete("eb_state");
  return res;
}
