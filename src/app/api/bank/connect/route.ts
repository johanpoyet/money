import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { startAuth } from "@/lib/enablebanking";

/** Démarre la connexion bancaire et redirige vers la validation dans l'app Caisse d'Épargne. */
export async function GET() {
  const state = randomBytes(16).toString("hex");
  const validUntil = new Date(Date.now() + 180 * 86400_000);
  const { url } = await startAuth({
    state,
    redirectUrl: `${process.env.APP_URL}/api/bank/callback`,
    validUntil,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set("eb_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 900, path: "/" });
  return res;
}
