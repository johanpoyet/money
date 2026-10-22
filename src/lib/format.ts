const eur0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1 282 € */
export const euros = (n: number) => `${eur0.format(Math.round(n))} €`;
/** 1 282,11 € */
export const eurosCents = (n: number) => `${eur2.format(n)} €`;
/** −52,00 / +339,29 (sans symbole, pour les listes) */
export const signed = (n: number) => `${n < 0 ? "−" : "+"}${eur2.format(Math.abs(n))}`;

export function dayLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
}

export function dayHeader(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export function monthLabel(month: string) {
  return new Date(`${month}-15T12:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export const GROUP_LABEL = { fixe: "Fixes", courant: "Courant", plaisir: "Plaisirs", hors: "Hors budget" } as const;
