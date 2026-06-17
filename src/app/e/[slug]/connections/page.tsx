import {
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  IdCard,
  Mail,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  acceptConnectionRequest,
  rejectConnectionRequest,
} from "@/app/e/[slug]/connections/actions";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ConnectionRequest = {
  id: string;
  requester_registration_id: string;
  receiver_registration_id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
};

type RegistrationContact = {
  id: string;
  email: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  attendee_profiles: {
    avatar_url: string | null;
    card_visibility: ProfileCardVisibility;
    profile_slug: string | null;
  } | null;
};

export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registrationId?: string; token?: string }>;
}) {
  const { slug } = await params;
  const { registrationId, token } = await searchParams;
  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const [{ data: received }, { data: sent }] = await Promise.all([
    adminClient
      .from("connection_requests")
      .select(
        "id, requester_registration_id, receiver_registration_id, status, created_at",
      )
      .eq("event_id", viewer.event_id)
      .eq("receiver_registration_id", viewer.id)
      .order("created_at", { ascending: false })
      .returns<ConnectionRequest[]>(),
    adminClient
      .from("connection_requests")
      .select(
        "id, requester_registration_id, receiver_registration_id, status, created_at",
      )
      .eq("event_id", viewer.event_id)
      .eq("requester_registration_id", viewer.id)
      .order("created_at", { ascending: false })
      .returns<ConnectionRequest[]>(),
  ]);

  const contacts = await loadContacts([
    ...(received ?? []).map((request) => request.requester_registration_id),
    ...(sent ?? []).map((request) => request.receiver_registration_id),
  ]);

  const accessQuery = `registrationId=${viewer.id}&token=${token}`;
  const pendingReceivedCount =
    received?.filter((request) => request.status === "pending").length ?? 0;

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="sticky top-0 z-40 border-b border-brand-border/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Conexiones
            </p>
            <h1 className="text-xl font-semibold text-brand-navy-950">
              {viewer.events?.name}
            </h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:-translate-y-0.5 hover:bg-brand-surface-soft"
            href={`/e/${slug}/directory?${accessQuery}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Directorio
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        {pendingReceivedCount ? (
          <div className="mb-5 flex gap-3 rounded-2xl border border-brand-border bg-brand-gradient-soft p-5 text-brand-navy-950 shadow-sm">
            <Bell
              className="mt-0.5 size-5 shrink-0 text-brand-cyan-500"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                Tienes {pendingReceivedCount} solicitud
                {pendingReceivedCount === 1 ? "" : "es"} nueva
                {pendingReceivedCount === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                Puedes aceptarla o rechazarla desde la seccion Recibidas.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title={`Recibidas${pendingReceivedCount ? ` (${pendingReceivedCount})` : ""}`}
          >
            {received?.length ? (
              received.map((request) => (
                <RequestCard
                  accessQuery={accessQuery}
                  contact={contacts.get(request.requester_registration_id)}
                  key={request.id}
                  request={request}
                  slug={slug}
                  type="received"
                />
              ))
            ) : (
              <EmptyState text="Aun no tienes solicitudes recibidas." />
            )}
          </Panel>

          <Panel title="Enviadas">
            {sent?.length ? (
              sent.map((request) => (
                <RequestCard
                  accessQuery={accessQuery}
                  contact={contacts.get(request.receiver_registration_id)}
                  key={request.id}
                  request={request}
                  slug={slug}
                  type="sent"
                />
              ))
            ) : (
              <EmptyState text="Aun no has enviado solicitudes." />
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-brand-navy-950">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function RequestCard({
  accessQuery,
  contact,
  request,
  slug,
  type,
}: {
  accessQuery: string;
  contact?: RegistrationContact;
  request: ConnectionRequest;
  slug: string;
  type: "received" | "sent";
}) {
  const canRespond = type === "received" && request.status === "pending";
  const isAccepted = request.status === "accepted";
  const cardSlug =
    contact?.attendee_profiles?.card_visibility !== "private"
      ? contact?.attendee_profiles?.profile_slug
      : null;

  return (
    <article
      className={`rounded-2xl border p-4 transition hover:shadow-md ${
        isAccepted
          ? "border-brand-aqua-400/50 bg-brand-gradient-soft"
          : "border-brand-border bg-brand-surface-soft"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar
            avatarUrl={contact?.attendee_profiles?.avatar_url}
            name={contact?.full_name_snapshot ?? "Asistente"}
          />
          <div>
            <p className="font-semibold text-brand-navy-950">
              {contact?.full_name_snapshot ?? "Asistente"}
            </p>
            <p className="mt-1 text-sm leading-6 text-brand-slate-600">
              {contact?.role_snapshot ?? "Rol por confirmar"}
              {contact?.company_snapshot
                ? ` en ${contact.company_snapshot}`
                : ""}
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {isAccepted && contact?.email ? (
        <p className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-brand-navy-950 shadow-sm">
          <Mail className="size-4 text-brand-cyan-500" aria-hidden="true" />
          {contact.email}
        </p>
      ) : null}

      {canRespond ? (
        <div className="mt-4 flex gap-2">
          <form action={acceptConnectionRequest}>
            <HiddenFields
              accessQuery={accessQuery}
              requestId={request.id}
              slug={slug}
            />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-brand-navy-950 px-3.5 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
              type="submit"
            >
              <Check className="size-4" aria-hidden="true" />
              Aceptar
            </button>
          </form>
          <form action={rejectConnectionRequest}>
            <HiddenFields
              accessQuery={accessQuery}
              requestId={request.id}
              slug={slug}
            />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              type="submit"
            >
              <X className="size-4" aria-hidden="true" />
              Rechazar
            </button>
          </form>
        </div>
      ) : null}

      {isAccepted && cardSlug ? (
        <Link
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-xl border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
          href={`/p/${cardSlug}?source=connection`}
        >
          <IdCard className="size-4 text-brand-cyan-500" aria-hidden="true" />
          Ver tarjeta virtual
        </Link>
      ) : null}
    </article>
  );
}

function StatusBadge({ status }: { status: ConnectionRequest["status"] }) {
  if (status === "accepted") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-navy-950 px-2 py-1 text-xs font-semibold text-brand-mint-300">
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        Aceptada
      </span>
    );
  }

  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-brand-blue-700 shadow-sm">
        <Clock className="size-3.5" aria-hidden="true" />
        Pendiente
      </span>
    );
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-slate-100 px-2 py-1 text-xs font-semibold text-brand-slate-600">
      <XCircle className="size-3.5" aria-hidden="true" />
      {status === "rejected" ? "Rechazada" : "Cancelada"}
    </span>
  );
}

function Avatar({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-brand-border"
        src={avatarUrl}
      />
    );
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-sm font-semibold text-white ring-2 ring-white">
      {initials(name)}
    </span>
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

function HiddenFields({
  accessQuery,
  requestId,
  slug,
}: {
  accessQuery: string;
  requestId: string;
  slug: string;
}) {
  const params = new URLSearchParams(accessQuery);

  return (
    <>
      <input name="slug" type="hidden" value={slug} />
      <input
        name="registrationId"
        type="hidden"
        value={params.get("registrationId") ?? ""}
      />
      <input name="token" type="hidden" value={params.get("token") ?? ""} />
      <input name="requestId" type="hidden" value={requestId} />
    </>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-brand-border bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
      {text}
    </p>
  );
}

async function loadContacts(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids));
  const contacts = new Map<string, RegistrationContact>();

  if (!uniqueIds.length) {
    return contacts;
  }

  const adminClient = createSupabaseAdminClient();
  const { data } = await adminClient
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, role_snapshot, company_snapshot, attendee_profiles(avatar_url, card_visibility, profile_slug)",
    )
    .in("id", uniqueIds)
    .returns<RegistrationContact[]>();

  data?.forEach((contact) => contacts.set(contact.id, contact));

  return contacts;
}
