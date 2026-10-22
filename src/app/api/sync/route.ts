import { NextResponse } from "next/server";
import { runSync } from "@/lib/sync";

/** Synchro manuelle (bouton « Synchroniser maintenant »). */
export async function POST() {
  try {
    const { inserted } = await runSync();
    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
