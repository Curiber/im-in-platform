"use client";

import {
  Building2,
  CalendarDays,
  Home,
  LogOut,
  Settings,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar({
  orgName,
  platformAdmin,
  role,
}: {
  orgName: string | null;
  platformAdmin: boolean;
  role: string | null;
}) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "Inicio", icon: Home, active: pathname === "/admin" },
    {
      href: "/admin/events",
      label: "Eventos",
      icon: CalendarDays,
      active: pathname.startsWith("/admin/events"),
    },
    ...(platformAdmin
      ? [
          {
            href: "/admin/organizations",
            label: "Organizaciones",
            icon: Building2,
            active: pathname.startsWith("/admin/organizations"),
          },
        ]
      : []),
    {
      href: "/admin/settings",
      label: "Configuracion",
      icon: Settings,
      active: pathname.startsWith("/admin/settings"),
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col bg-gradient-to-b from-brand-navy-900 to-brand-navy-950 px-2 py-5 lg:w-60 lg:px-4">
      <Link
        className="flex items-center justify-center lg:justify-start lg:px-2"
        href="/admin"
      >
        <Image
          alt="I'M IN"
          className="hidden h-auto w-28 lg:block"
          height={35}
          src="/brand/im-in-logo-white.png"
          width={140}
        />
        <Image
          alt="I'M IN"
          className="size-8 lg:hidden"
          height={32}
          src="/brand/im-in-mark.png"
          width={32}
        />
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                item.active
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
              href={item.href}
              key={item.href}
              title={item.label}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-4">
        {orgName ? (
          <div className="hidden items-center gap-2 px-2 lg:flex">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-xs font-bold text-white">
              {initials(orgName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {orgName}
              </p>
              {role ? (
                <p className="text-[11px] text-white/55">{formatRole(role)}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        <form action="/auth/sign-out" className="mt-2" method="post">
          <button
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Cerrar sesion"
            type="submit"
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">Cerrar sesion</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(role: string) {
  const labels: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    event_admin: "Admin de evento",
  };

  return labels[role] ?? role;
}
