import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db, schema } from "@/db";

const GROUPS = ["fixe", "courant", "plaisir", "hors"] as const;
type Group = (typeof GROUPS)[number];

/** « Coiffeur & soins » → « coiffeur-soins ». */
function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Crée une catégorie depuis le formulaire de classement. « hors » = exclue des dépenses. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as { name?: string; group?: string };
  const name = body.name?.trim().replace(/\s+/g, " ") ?? "";
  const group = body.group as Group;
  const slug = slugify(name);
  if (!slug || name.length > 40) return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  if (!GROUPS.includes(group)) return NextResponse.json({ error: "Famille invalide" }, { status: 400 });

  const [existing] = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.slug, slug));
  if (existing) return NextResponse.json({ error: "Cette catégorie existe déjà" }, { status: 409 });

  const [created] = await db
    .insert(schema.categories)
    .values({ slug, name, group, excluded: group === "hors" })
    .returning({ id: schema.categories.id, name: schema.categories.name, group: schema.categories.group });
  return NextResponse.json(created);
}
