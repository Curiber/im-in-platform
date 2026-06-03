import { ArrowLeft, Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import {
  acceptConnectionRequest,
  rejectConnectionRequest,
} from "@/app/e/[slug]/connections/actions";
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
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Conexiones
            </p>
            <h1 className="text-xl font-semibold">{viewer.events?.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/e/${slug}/directory?${accessQuery}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Directorio
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        {pendingReceivedCount ? (
          <div className="mb-5 flex gap-3 rounded-lg border border-[#cfe4c4] bg-[#eef6e9] p-4 text-[#2f6f4e] shadow-sm">
            <Bell className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Tienes {pendingReceivedCount} solicitud
                {pendingReceivedCount === 1 ? "" : "es"} nueva
                {pendingReceivedCount === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-sm leading-6">
                Puedes aceptarla o rechazarla desde la seccion Recibidas.
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`Recibidas${pendingReceivedCount ? ` (${pendingReceivedCount})` : ""}`}>
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

function Panel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{title}</h2>
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

  return (
    <article className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            {contact?.full_name_snapshot ?? "Asistente"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#5f625d]">
            {contact?.role_snapshot ?? "Rol por confirmar"}
            {contact?.company_snapshot ? ` en ${contact.company_snapshot}` : ""}
          </p>
          {request.status === "accepted" && contact?.email ? (
            <p className="mt-2 text-sm font-semibold text-[#2f6f4e]">
              {contact.email}
            </p>
          ) : null}
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#254f74]">
          {formatStatus(request.status)}
        </span>
      </div>

      {canRespond ? (
        <div className="mt-4 flex gap-2">
          <form action={acceptConnectionRequest}>
            <HiddenFields accessQuery={accessQuery} requestId={request.id} slug={slug} />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#102923] px-3 text-sm font-semibold text-white hover:bg-[#183b33]"
              type="submit"
            >
              <Check className="size-4" aria-hidden="true" />
              Aceptar
            </button>
          </form>
          <form action={rejectConnectionRequest}>
            <HiddenFields accessQuery={accessQuery} requestId={request.id} slug={slug} />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d9d5cb] px-3 text-sm font-semibold text-[#1f2723] hover:bg-white"
              type="submit"
            >
              <X className="size-4" aria-hidden="true" />
              Rechazar
            </button>
          </form>
        </div>
      ) : null}
    </article>
  );
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
    <p className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4 text-sm text-[#5f625d]">
      {text}
    </p>
  );
}

function formatStatus(status: ConnectionRequest["status"]) {
  const labels = {
    accepted: "Aceptada",
    cancelled: "Cancelada",
    pending: "Pendiente",
    rejected: "Rechazada",
  };

  return labels[status];
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
    .select("id, email, full_name_snapshot, role_snapshot, company_snapshot")
    .in("id", uniqueIds)
    .returns<RegistrationContact[]>();

  data?.forEach((contact) => contacts.set(contact.id, contact));

  return contacts;
}
