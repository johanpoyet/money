import { redirect } from "next/navigation";
import { createSession, verifyPassword, verifyTotp } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "");
  // Petit délai fixe pour freiner les essais en rafale (Fail2ban peut compléter côté Nginx).
  await new Promise((r) => setTimeout(r, 600));
  if (!verifyPassword(password) || !verifyTotp(code)) redirect("/login?erreur=1");
  await createSession();
  redirect("/");
}

export default async function Login({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center gap-7 px-5 py-10">
      <div
        aria-hidden
        className="flex size-[88px] items-center justify-center rounded-full"
        style={{ background: "conic-gradient(var(--color-fixe) 0 58.7%, var(--color-courant) 58.7% 75.7%, var(--color-plaisir) 75.7% 100%)" }}
      >
        <div className="size-[64px] rounded-full bg-bg" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[34px] font-extrabold leading-tight tracking-tight">Money</h1>
        <p className="text-[15px] text-muted">Tes comptes, classés tout seuls.</p>
      </div>
      <form action={login} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-[13px] font-semibold text-muted">
            Mot de passe
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="h-12 rounded-2xl border border-line bg-surface px-4 text-[15px]" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="code" className="text-[13px] font-semibold text-muted">
            Code de l&apos;app d&apos;authentification
          </label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" required className="num h-12 rounded-2xl border border-line bg-surface px-4 text-[17px] tracking-[0.3em]" />
        </div>
        {erreur && <p className="text-sm text-over">Mot de passe ou code incorrect.</p>}
        <button className="mt-2 h-14 rounded-[18px] bg-ink text-base font-bold text-bg">Se connecter</button>
      </form>
    </main>
  );
}
