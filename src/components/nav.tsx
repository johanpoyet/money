"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Accueil", d: ["M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"] },
  { href: "/operations", label: "Opérations", d: ["M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"] },
  { href: "/budget", label: "Budget", d: ["M21 12A9 9 0 1 1 12 3v9z", "M15 3.5A9 9 0 0 1 20.5 9H15z"] },
  { href: "/reglages", label: "Réglages", d: ["M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"], circles: [[16, 6], [10, 12], [18, 18]] },
] as const;

/** Barre d'onglets flottante (DA Nuit). */
export function Nav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-5 z-20 mx-auto grid max-w-[440px] grid-cols-4 rounded-[26px] bg-surface p-1.5"
      style={{ bottom: "max(22px, env(safe-area-inset-bottom))" }}
    >
      {ITEMS.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-label={it.label}
            aria-current={active ? "page" : undefined}
            className={`flex h-12 items-center justify-center rounded-[20px] ${active ? "bg-ink text-bg" : "text-muted"}`}
          >
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {it.d.map((d) => (
                <path key={d} d={d} />
              ))}
              {"circles" in it && it.circles.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" />)}
            </svg>
          </Link>
        );
      })}
    </nav>
  );
}

/** Conteneur d'écran mobile : marges, place pour la barre d'onglets. */
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="mx-auto flex max-w-[480px] flex-col gap-5 px-5 pb-32 pt-7" style={{ paddingTop: "max(28px, env(safe-area-inset-top))" }}>
        {children}
      </main>
      <Nav />
    </>
  );
}
