export const metadata = { title: "Conditions · Money" };

export default function Conditions() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-5 py-12 text-[15px] leading-relaxed">
      <h1 className="text-[26px] font-extrabold tracking-tight">Conditions d&apos;utilisation</h1>
      <p>
        Money est un outil personnel de suivi de budget, réservé à son auteur. Aucun compte ne peut être créé par un tiers et
        aucun service n&apos;est fourni au public.
      </p>
      <p>
        L&apos;application se limite à la consultation, en lecture seule, des comptes de son auteur. Elle ne fournit aucun
        conseil financier et n&apos;exécute aucune opération bancaire.
      </p>
      <p className="text-muted">Contact : via johanpoyet.fr</p>
    </main>
  );
}
