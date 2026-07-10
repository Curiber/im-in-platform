import { Check, IdCard, Mail, Phone, Users, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  acceptConnection,
  rejectConnection,
} from "@/app/app/conexiones/actions";
import { getAttendeeUser } from "@/lib/attendee-account";
import {
  getMyConnections,
  getMyPendingConnections,
  type MyConnection,
  type PendingConnectionRequest,
} from "@/lib/attendee-connections";

export const dynamic = "force-dynamic";

export default async function MyConnectionsPage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/conexiones");
  }

  const [connections, pending] = await Promise.all([
    getMyConnections(),
    getMyPendingConnections(),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <Users className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Mis conexiones
      </h1>
      <p className="mt-2 text-brand-slate-600">
        Las personas con quienes conectaste, de todos tus eventos. Su
        informacion se mantiene al dia con su perfil.
      </p>

      {pending.length ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">
            Solicitudes recibidas ({pending.length})
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pending.map((request) => (
              <PendingCard key={request.requestId} request={request} />
            ))}
          </div>
        </section>
      ) : null}

      {connections.length ? (
        <h2 className="mt-8 text-lg font-semibold">Conectados</h2>
      ) : null}

      {connections.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {connections.map((connection) => (
            <ConnectionCard connection={connection} key={connection.key} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-10 text-center shadow-sm">
          <Users
            className="mx-auto size-10 text-brand-cyan-500"
            aria-hidden="true"
          />
          <p className="mt-3 font-semibold text-brand-navy-950">
            Aun no tienes conexiones
          </p>
          <p className="mt-1 text-sm text-brand-slate-600">
            Cuando aceptes (o te acepten) una solicitud en un evento, la persona
            aparecera aqui.
          </p>
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            href="/app/eventos"
          >
            Ir a mis eventos
          </Link>
        </div>
      )}
    </main>
  );
}

function PendingCard({ request }: { request: PendingConnectionRequest }) {
  return (
    <article className="rounded-2xl border border-brand-border bg-brand-surface-soft p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar
          avatarUrl={request.requesterAvatarUrl}
          name={request.requesterName}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-brand-navy-950">
            {request.requesterName}
          </h3>
          <p className="truncate text-sm text-brand-slate-600">
            {request.requesterRole ?? "Rol por confirmar"}
            {request.requesterCompany ? ` · ${request.requesterCompany}` : ""}
          </p>
          <p className="mt-0.5 truncate text-xs text-brand-slate-600">
            En {request.eventName}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <form action={acceptConnection}>
          <input name="requestId" type="hidden" value={request.requestId} />
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-navy-950 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            type="submit"
          >
            <Check className="size-4" aria-hidden="true" />
            Aceptar
          </button>
        </form>
        <form action={rejectConnection}>
          <input name="requestId" type="hidden" value={request.requestId} />
          <button
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            type="submit"
          >
            <X className="size-4" aria-hidden="true" />
            Rechazar
          </button>
        </form>
      </div>
    </article>
  );
}

function ConnectionCard({ connection }: { connection: MyConnection }) {
  return (
    <article className="flex flex-col rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar avatarUrl={connection.avatarUrl} name={connection.fullName} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-brand-navy-950">
            {connection.fullName}
          </h2>
          <p className="truncate text-sm text-brand-slate-600">
            {connection.role ?? "Rol por confirmar"}
            {connection.company ? ` · ${connection.company}` : ""}
          </p>
          {connection.headline ? (
            <p className="mt-0.5 truncate text-sm italic text-brand-slate-600">
              {connection.headline}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <ContactRow icon={<Mail className="size-4" aria-hidden="true" />}>
          <a
            className="truncate hover:underline"
            href={`mailto:${connection.email}`}
          >
            {connection.email}
          </a>
        </ContactRow>
        {connection.phone ? (
          <ContactRow icon={<Phone className="size-4" aria-hidden="true" />}>
            <a className="hover:underline" href={`tel:${connection.phone}`}>
              {connection.phone}
            </a>
          </ContactRow>
        ) : null}
        {connection.linkedinUrl ? (
          <ContactRow icon={<LinkedInIcon className="size-4" />}>
            <a
              className="truncate hover:underline"
              href={connection.linkedinUrl}
              rel="noreferrer"
              target="_blank"
            >
              LinkedIn
            </a>
          </ContactRow>
        ) : null}
      </div>

      {connection.events.length ? (
        <p className="mt-4 text-xs leading-5 text-brand-slate-600">
          Se conocieron en{" "}
          <span className="font-semibold text-brand-navy-950">
            {connection.events.map((event) => event.eventName).join(", ")}
          </span>
        </p>
      ) : null}

      {connection.profileSlug ? (
        <Link
          className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
          href={`/p/${connection.profileSlug}?source=connection`}
        >
          <IdCard className="size-4 text-brand-cyan-500" aria-hidden="true" />
          Ver tarjeta virtual
        </Link>
      ) : null}
    </article>
  );
}

function ContactRow({
  children,
  icon,
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-brand-slate-600">
      <span className="text-brand-cyan-500">{icon}</span>
      {children}
    </p>
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null;
  name: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="size-12 shrink-0 rounded-full object-cover ring-2 ring-white"
        src={avatarUrl}
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-sm font-semibold text-white ring-2 ring-white">
      {initials}
    </span>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.11 20.45H3.56V9h3.55v11.45z" />
    </svg>
  );
}
