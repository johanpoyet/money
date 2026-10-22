import { Screen } from "@/components/nav";
import { Gauge } from "@/components/ui";
import { db, schema } from "@/db";
import { euros } from "@/lib/format";
import { currentMonth, groupTotals } from "@/lib/queries";

export const dynamic = "force-dynamic";

const GROUPS = [
  { key: "fixe", label: "Charges fixes", dot: "bg-fixe" },
  { key: "courant", label: "Vie courante", dot: "bg-courant" },
  { key: "plaisir", label: "Plaisirs", dot: "bg-plaisir" },
] as const;

export default async function Budget() {
  const month = currentMonth();
  const [{ totals, rows }, cats] = await Promise.all([groupTotals(month), db.select().from(schema.categories)]);
  const spentById = new Map(rows.map((r) => [r.categoryId, Number(r.spent)]));

  const variableBudget = cats
    .filter((c) => c.group === "courant" || c.group === "plaisir")
    .reduce((s, c) => s + Number(c.monthlyBudget ?? 0), 0);
  const left = variableBudget - totals.courant - totals.plaisir;
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <Screen>
      <h1 className="text-[26px] font-extrabold tracking-tight">Budget</h1>

      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-muted">Il reste à dépenser ce mois-ci</span>
        <span className={`num text-4xl ${left < 0 ? "text-over" : ""}`}>{euros(left)}</span>
        <span className="text-[13px] text-muted">
          sur {euros(variableBudget)} prévus pour la vie courante et les plaisirs · {daysLeft} jours restants
        </span>
      </div>

      {GROUPS.map((g) => {
        const list = cats.filter((c) => c.group === g.key && (c.monthlyBudget !== null || spentById.has(c.id)));
        const groupBudget = list.reduce((s, c) => s + Number(c.monthlyBudget ?? 0), 0);
        return (
          <section key={g.key} className="flex flex-col gap-3 rounded-[20px] bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <span className="flex items-center gap-2 text-sm font-bold">
                <span className={`size-2 rounded-full ${g.dot}`} />
                {g.label}
              </span>
              <span className="num text-[13px]">
                {Math.round(totals[g.key])}
                {groupBudget ? ` / ${Math.round(groupBudget)}` : ""}
              </span>
            </div>
            {list.map((c) => {
              const spent = spentById.get(c.id) ?? 0;
              const budget = Number(c.monthlyBudget ?? 0);
              return (
                <div key={c.id} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[13px]">
                    <span>{c.name}</span>
                    <span className={`num ${budget && spent > budget ? "text-over" : ""}`}>
                      {Math.round(spent)}
                      {budget ? ` / ${Math.round(budget)}` : ""}
                    </span>
                  </div>
                  {budget > 0 && <Gauge spent={spent} budget={budget} group={g.key} />}
                </div>
              );
            })}
          </section>
        );
      })}
    </Screen>
  );
}
