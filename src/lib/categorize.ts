import type { Rule } from "@/db/schema";

/** Libellé lisible : retire les préfixes bancaires courants et met en casse titre. */
export function cleanLabel(raw: string): string {
  const stripped = raw
    .replace(/^(ACHAT CB|CB|CARTE|PRLV( SEPA)?|VIR(EMENT)?\.?( SEPA)?( INST(ANTANE)?)?( RECU| EMIS)?( VERS| DE)?)\s+/i, "")
    .replace(/\s+FACT\s+\d{6}.*$/i, "")
    .replace(/\s+\d{6}\*+\d+\s*$/, "")
    .replace(/^\*\s*/, "")
    .replace(/\s+\d{2}\/\d{2}(\/\d{2,4})?\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return stripped
    .toLowerCase()
    .replace(/(^|[\s'’-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

/**
 * Trouve la règle qui s'applique à une opération.
 * Ordre : priorité croissante, puis règles avec montant d'abord (plus précises).
 */
export function matchRule(rawLabel: string, amount: number, rules: Rule[]): Rule | undefined {
  const label = rawLabel.toUpperCase();
  const sorted = [...rules].sort(
    (a, b) => a.priority - b.priority || Number(b.amount !== null) - Number(a.amount !== null),
  );
  return sorted.find((r) => {
    const patterns = r.pattern.split("|").map((p) => p.trim().toUpperCase()).filter(Boolean);
    if (!patterns.some((p) => label.includes(p))) return false;
    if (r.amount !== null && Math.abs(Math.abs(amount) - Number(r.amount)) > 0.005) return false;
    return true;
  });
}
