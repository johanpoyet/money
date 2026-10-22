import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";

/** Tout l'app est privé, sauf la page de connexion, le manifeste PWA et les fichiers statiques. */
export async function proxy(req: NextRequest) {
  const ok = await isValidSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|confidentialite|conditions|manifest.webmanifest|icon|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
