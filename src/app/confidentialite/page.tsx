export const metadata = { title: "Confidentialité · Money" };

export default function Confidentialite() {
  return (
    <main className="mx-auto flex max-w-[640px] flex-col gap-4 px-5 py-12 text-[15px] leading-relaxed">
      <h1 className="text-[26px] font-extrabold tracking-tight">Confidentialité</h1>
      <p>
        Money est une application personnelle, utilisée par une seule personne (son auteur, Johan Poyet) pour suivre ses
        propres dépenses. Elle n&apos;est pas proposée au public.
      </p>
      <p>
        L&apos;accès aux comptes bancaires se fait en <b>lecture seule</b>, via Enable Banking, avec le consentement explicite
        du titulaire donné dans l&apos;application de sa banque. Aucun paiement ni virement ne peut être initié. Les
        identifiants bancaires ne transitent jamais par l&apos;application.
      </p>
      <p>
        Les soldes et opérations récupérés sont stockés uniquement sur un serveur privé appartenant à l&apos;auteur, hébergé en
        France. Ils ne sont ni partagés, ni vendus, ni utilisés à d&apos;autres fins que le suivi de budget personnel.
        L&apos;accès peut être révoqué à tout moment depuis l&apos;application ou auprès de la banque.
      </p>
      <p className="text-muted">Contact : via johanpoyet.fr</p>
    </main>
  );
}
