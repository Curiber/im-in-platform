import { Bell, CalendarClock, IdCard, UserRoundPen, Users } from "lucide-react";
import Link from "next/link";

type NetworkingTab = "personas" | "conexiones" | "agenda" | "perfil";

const itemBase =
  "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition";
const activeClass = "bg-white text-brand-navy-950";
const idleClass = "text-white/85 hover:bg-white/10";

export function NetworkingNav({
  accessQuery,
  active,
  cardSlug,
  coverUrl,
  eventName,
  pendingCount = 0,
  pendingMeetingsCount = 0,
  slug,
}: {
  accessQuery: string;
  active: NetworkingTab;
  cardSlug?: string | null;
  coverUrl: string;
  eventName: string;
  pendingCount?: number;
  pendingMeetingsCount?: number;
  slug: string;
}) {
  return (
    <header className="relative isolate overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={eventName}
        className="absolute inset-0 size-full object-cover"
        src={coverUrl}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-navy-950/95 via-brand-navy-950/85 to-brand-navy-950/70" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              Networking
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {eventName}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur">
            <NavItem
              active={active === "personas"}
              href={`/e/${slug}/directory?${accessQuery}`}
              icon={<Users className="size-4" aria-hidden="true" />}
              label="Personas"
            />
            <NavItem
              active={active === "conexiones"}
              badge={pendingCount}
              href={`/e/${slug}/connections?${accessQuery}`}
              icon={<Bell className="size-4" aria-hidden="true" />}
              label="Conexiones"
            />
            <NavItem
              active={active === "agenda"}
              badge={pendingMeetingsCount}
              href={`/e/${slug}/meetings?${accessQuery}`}
              icon={<CalendarClock className="size-4" aria-hidden="true" />}
              label="Agenda"
            />
            {cardSlug ? (
              <Link
                className={`${itemBase} ${idleClass}`}
                href={`/p/${cardSlug}?source=event`}
                target="_blank"
              >
                <IdCard className="size-4" aria-hidden="true" />
                Mi tarjeta
              </Link>
            ) : null}
            <NavItem
              active={active === "perfil"}
              href={`/e/${slug}/profile?${accessQuery}`}
              icon={<UserRoundPen className="size-4" aria-hidden="true" />}
              label="Mi perfil"
            />
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavItem({
  active,
  badge = 0,
  href,
  icon,
  label,
}: {
  active: boolean;
  badge?: number;
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const badgeNode = badge ? (
    <span className="rounded-full bg-brand-aqua-400 px-2 py-0.5 text-xs font-bold text-brand-navy-950">
      {badge}
    </span>
  ) : null;

  if (active) {
    return (
      <span className={`${itemBase} ${activeClass}`}>
        {icon}
        {label}
        {badgeNode}
      </span>
    );
  }

  return (
    <Link className={`${itemBase} ${idleClass}`} href={href}>
      {icon}
      {label}
      {badgeNode}
    </Link>
  );
}
