import {
  CalendarClock,
  CalendarDays,
  Compass,
  Home,
  Settings,
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
  { href: "/app/configuracion", label: "Configuracion", icon: Settings },
];

export function AppNav({
  email,
  pendingConnections = 0,
  pendingMeetings = 0,
}: {
  email: string | null;
  pendingConnections?: number;
  pendingMeetings?: number;
}) {
  const badgeFor = (href: string) => {
    if (href === "/app/conexiones") return pendingConnections;
    if (href === "/app/reuniones") return pendingMeetings;
    return 0;
  };

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
            <NavLink badge={badgeFor(link.href)} href={link.href} key={link.href}>
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
          <NavLink badge={badgeFor(link.href)} href={link.href} key={link.href}>
            <link.icon className="size-4" aria-hidden="true" />
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function NavLink({
  badge = 0,
  href,
  children,
}: {
  badge?: number;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold text-brand-slate-600 transition hover:bg-brand-surface-soft hover:text-brand-navy-950"
      href={href}
    >
      {children}
      {badge > 0 ? (
        <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-cyan-500 px-1.5 text-xs font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
