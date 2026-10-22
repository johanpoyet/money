/**
 * Catégories, budgets et règles de départ, repris du classement fait à la main sur septembre-octobre 2026.
 * Idempotent : on peut le relancer sans créer de doublons.
 */
import "dotenv/config";

type G = "fixe" | "courant" | "plaisir" | "hors";
const CATEGORIES: { slug: string; name: string; group: G; budget?: number; excluded?: boolean }[] = [
  { slug: "logement", name: "Logement", group: "fixe" },
  { slug: "energie", name: "Électricité", group: "fixe" },
  { slug: "telecom", name: "Télécom", group: "fixe" },
  { slug: "assurances", name: "Assurances", group: "fixe" },
  { slug: "banque", name: "Frais bancaires", group: "fixe" },
  { slug: "outils", name: "Outils pro", group: "fixe" },
  { slug: "abonnements", name: "Abonnements", group: "fixe" },
  { slug: "voiture", name: "Entretien voiture", group: "fixe" },
  { slug: "courses", name: "Courses", group: "courant", budget: 170 },
  { slug: "carburant", name: "Carburant", group: "courant", budget: 150 },
  { slug: "peages", name: "Péages et parking", group: "courant", budget: 30 },
  { slug: "restos", name: "Restos", group: "plaisir", budget: 150 },
  { slug: "shopping", name: "Shopping", group: "plaisir", budget: 120 },
  { slug: "vape", name: "Vape", group: "plaisir", budget: 50 },
  { slug: "soins", name: "Coiffeur et soins", group: "plaisir", budget: 25 },
  { slug: "cadeaux", name: "Cadeaux", group: "plaisir", budget: 30 },
  { slug: "sorties", name: "Sorties et amis", group: "plaisir", budget: 50 },
  { slug: "vacances", name: "Vacances", group: "plaisir", budget: 25 },
  { slug: "epargne", name: "Épargne", group: "hors", excluded: true },
  { slug: "interne", name: "Virements internes", group: "hors", excluded: true },
  { slug: "entrees", name: "Entrées", group: "hors", excluded: true },
];

const RULES: { pattern: string; category: string; amount?: number; yearly?: boolean; priority?: number }[] = [
  { pattern: "FREDERIC POYET|ISABELLE ET FREDERIC", category: "logement", amount: 550, priority: 10 },
  // Libellés bruts tels que la Caisse d'Épargne les envoie via l'API
  { pattern: "OFFRE CONFORT|COMMISSION INTERVENTION|INTERET DEBITEUR", category: "banque" },
  { pattern: "PEAGE|ASF |A.R.E.A|PKG |LPA |HORODATEUR", category: "peages" },
  { pattern: "RELAIS DU LOMBA|COMMUNAY SUD|AVIADAC", category: "carburant", priority: 50 },
  { pattern: "MC DO|BK 1|KFC|POPEYES|CHIP Y CHOP|PEPPE|GIARDINO|CASA NOBILE|SUNDAY*", category: "restos" },
  { pattern: "VAPOSUD|PAYPAL *TAFFE", category: "vape" },
  { pattern: "PULL AND BEAR|STARDRESSSHOP|ASOSPAY", category: "shopping" },
  { pattern: "HELLOCSE", category: "sorties" },
  { pattern: "JOHAN REVOLUT", category: "interne", priority: 5 },
  { pattern: "EDF|ELECTRICITE DE FRANCE", category: "energie" },
  { pattern: "BOUYGUES", category: "telecom" },
  { pattern: "MACIF|BPCE ASSURANCES", category: "assurances" },
  { pattern: "COTISATION|REMISE COTIS", category: "banque" },
  { pattern: "OVH|SUPABASE|ANTHROPIC", category: "outils" },
  { pattern: "APPLE.COM/BILL", category: "abonnements" },
  { pattern: "PROTON", category: "abonnements", yearly: true },
  { pattern: "DEKRA|NORISKO", category: "voiture" },
  { pattern: "AUCHAN|LECLERC|MAISON PEY|CARREFOUR|LIDL", category: "courses" },
  { pattern: "TOTAL|INTERMARCHE|DAC NETTO|CALAO|ESSO|BP ", category: "carburant", priority: 50 },
  { pattern: "AREA|APRR|PARKING|EASYPARK|SPLM|BOULEVARD PERIPHERIQUE|PARC ", category: "peages" },
  { pattern: "RESTO|MC DONALD|MCDO|BURGER KING|ENTRECOTE|PIZZA|MAXICOFFEE|BISTROT", category: "restos" },
  { pattern: "AMAZON|ECOCENTRIC|PANDORA|JARDIN D'ALICE", category: "shopping" },
  { pattern: "VAPELYS|CLOP", category: "vape" },
  { pattern: "PLANITY", category: "soins" },
  { pattern: "LIVRET A", category: "epargne", priority: 5 },
  { pattern: "CPT DEPOT|POYET JOHAN", category: "interne", priority: 5 },
  { pattern: "CAF DU RHONE", category: "entrees" },
];

async function main() {
  const { db, schema } = await import("../src/db");
  const { reapplyRules } = await import("../src/lib/sync");

  for (const c of CATEGORIES) {
    await db
      .insert(schema.categories)
      .values({ slug: c.slug, name: c.name, group: c.group, excluded: c.excluded ?? false, monthlyBudget: c.budget?.toFixed(2) ?? null })
      .onConflictDoNothing({ target: schema.categories.slug });
  }
  const cats = await db.select().from(schema.categories);
  const bySlug = new Map(cats.map((c) => [c.slug, c.id]));

  const existing = await db.select().from(schema.rules);
  for (const r of RULES) {
    if (existing.some((e) => e.pattern === r.pattern)) continue;
    await db.insert(schema.rules).values({
      pattern: r.pattern,
      categoryId: bySlug.get(r.category)!,
      amount: r.amount?.toFixed(2) ?? null,
      yearly: r.yearly ?? false,
      priority: r.priority ?? 100,
    });
  }
  // Recalcule les libellés lisibles (le nettoyage a pu évoluer).
  const { cleanLabel } = await import("../src/lib/categorize");
  const { eq } = await import("drizzle-orm");
  for (const t of await db.select({ id: schema.transactions.id, raw: schema.transactions.rawLabel }).from(schema.transactions)) {
    await db.update(schema.transactions).set({ label: cleanLabel(t.raw) }).where(eq(schema.transactions.id, t.id));
  }
  const n = await reapplyRules();
  console.log(`Seed OK : ${cats.length} catégories, ${RULES.length} règles, ${n} opération(s) reclassée(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
