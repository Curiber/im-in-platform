import {
  CalendarClock,
  CalendarDays,
  Compass,
  Home,
  Users,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  { href: "/app", label: "Inicio", icon: Home },
  { href: "/app/eventos", label: "Mis eventos", icon: CalendarDays },
  { href: "/app/conexiones", label: "Conexiones", icon: Users },
  { href: "/app/reuniones", label: "Reuniones", icon: CalendarClock },
  { href: "/app/explorar", label: "Explorar", icon: Compass },
  { href: "/app/perfil", label: "Mi perfil", icon: UserRound },
];

export function AppNav({ email }: { email: string | null }) {
  return (
    <header className="border-b border-brand-border bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link className="inline-flex items-center" href="/app">
          <Image
            alt="I'M IN"
            className="h-auto w-24"
            height={30}
            src="/brand/im-in-logo.png"
            width={120}
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink href={link.href} key={link.href}>
              <link.icon className="size-4" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {email ? (
            <span className="hidden text-sm text-brand-slate-600 sm:inline">
              {email}
            </span>
          ) : null}
          <form action="/auth/sign-out?next=/acceso" method="post">
            <button
              className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              type="submit"
            >
              Salir
            </button>
          </form>
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-brand-border px-3 py-2 md:hidden">
        {links.map((link) => (
          <NavLink href={link.href} key={link.href}>
            <link.icon className="size-4" aria-hidden="true" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 transition hover:bg-brand-surface-soft hover:text-brand-navy-950"
      href={href}
    >
      {children}
    </Link>
  );
}
