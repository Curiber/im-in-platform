import { Bell, IdCard, UserRoundPen, Users } from "lucide-react";
import Link from "next/link";

type NetworkingTab = "personas" | "conexiones" | "perfil";

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
  eyebrow = "Networking",
  pendingCount = 0,
  slug,
  subtitle,
}: {
  accessQuery: string;
  active: NetworkingTab;
  cardSlug?: string | null;
  coverUrl: string;
  eventName: string;
  eyebrow?: string;
  pendingCount?: number;
  slug: string;
  subtitle?: string;
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-mint-300">
              {eyebrow}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {eventName}
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-white/75">{subtitle}</p>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur">
            {active === "personas" ? (
              <span className={`${itemBase} ${activeClass}`}>
                <Users className="size-4" aria-hidden="true" />
                Personas
              </span>
            ) : (
              <Link
                className={`${itemBase} ${idleClass}`}
                href={`/e/${slug}/directory?${accessQuery}`}
              >
                <Users className="size-4" aria-hidden="true" />
                Personas
              </Link>
            )}

            {active === "conexiones" ? (
              <span className={`${itemBase} ${activeClass}`}>
                <Bell className="size-4" aria-hidden="true" />
                Conexiones
                {pendingCount ? (
                  <span className="rounded-full bg-brand-aqua-400 px-2 py-0.5 text-xs font-bold text-brand-navy-950">
                    {pendingCount}
                  </span>
                ) : null}
              </span>
            ) : (
              <Link
                className={`${itemBase} ${idleClass}`}
                href={`/e/${slug}/connections?${accessQuery}`}
              >
                <Bell className="size-4" aria-hidden="true" />
                Conexiones
                {pendingCount ? (
                  <span className="rounded-full bg-brand-aqua-400 px-2 py-0.5 text-xs font-bold text-brand-navy-950">
                    {pendingCount}
                  </span>
                ) : null}
              </Link>
            )}

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

            {active === "perfil" ? (
              <span className={`${itemBase} ${activeClass}`}>
                <UserRoundPen className="size-4" aria-hidden="true" />
                Mi perfil
              </span>
            ) : (
              <Link
                className={`${itemBase} ${idleClass}`}
                href={`/e/${slug}/profile?${accessQuery}`}
              >
                <UserRoundPen className="size-4" aria-hidden="true" />
                Mi perfil
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
