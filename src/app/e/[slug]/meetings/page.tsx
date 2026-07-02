import {
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  X,
  XCircle,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { NetworkingNav } from "@/app/e/[slug]/_components/networking-nav";
import {
  acceptMeeting,
  cancelMeeting,
  declineMeeting,
} from "@/app/e/[slug]/meetings/actions";
import { formatDateTimeRange } from "@/lib/datetime";
import { resolveEventCover } from "@/lib/event-cover";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyRegistrationAccess } from "@/lib/registrations";

export const dynamic = "force-dynamic";

type MeetingStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

type MeetingRow = {
  id: string;
  requester_registration_id: string;
  receiver_registration_id: string;
  location_id: string | null;
  status: MeetingStatus;
  starts_at: string;
  ends_at: string;
  message: string | null;
};

type Contact = {
  id: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  attendee_profiles: { avatar_url: string | null } | null;
};

// Mensajes para el resultado de proponer/responder/cancelar (query param
// `meetingStatus`, seteado por las actions tras la RPC).
const statusMessages: Record<string, { text: string; tone: "ok" | "error" }> = {
  ok: { text: "Propuesta de reunion enviada.", tone: "ok" },
  accepted: { text: "Reunion aceptada: quedo en tu agenda.", tone: "ok" },
  declined: { text: "Reunion rechazada.", tone: "ok" },
  cancelled: { text: "Reunion cancelada.", tone: "ok" },
  conflict: {
    text: "Esa franja choca con otra reunion (o el punto de encuentro esta lleno). Prueba con otra.",
    tone: "error",
  },
  invalid_slot: {
    text: "La franja elegida no esta dentro del horario del evento.",
    tone: "error",
  },
  invalid_location: {
    text: "El punto de encuentro ya no esta disponible.",
    tone: "error",
  },
  invalid_participant: {
    text: "Esa persona ya no participa del networking del evento.",
    tone: "error",
  },
  unavailable: {
    text: "El evento no permite agendar reuniones en este momento.",
    tone: "error",
  },
  not_found: {
    text: "La reunion ya no esta disponible.",
    tone: "error",
  },
  error: {
    text: "No pudimos completar la accion. Intentalo nuevamente.",
    tone: "error",
  },
};

export default async function MeetingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    meetingStatus?: string;
    registrationId?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const { meetingStatus, registrationId, token } = await searchParams;
  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer || !viewer.events?.networking_enabled) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const [{ data: meetings }, { count: pendingReceivedCount }] =
    await Promise.all([
      adminClient
        .from("meetings")
        .select(
          "id, requester_registration_id, receiver_registration_id, location_id, status, starts_at, ends_at, message",
        )
        .eq("event_id", viewer.event_id)
        .or(
          `requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${viewer.id}`,
        )
        .order("starts_at", { ascending: true })
        .returns<MeetingRow[]>(),
      adminClient
        .from("connection_requests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", viewer.event_id)
        .eq("receiver_registration_id", viewer.id)
        .eq("status", "pending"),
    ]);

  const rows = meetings ?? [];
  const [contacts, locations] = await Promise.all([
    loadContacts(
      rows.map((meeting) => counterpartId(meeting, viewer.id)),
      adminClient,
    ),
    loadLocations(
      rows
        .map((meeting) => meeting.location_id)
        .filter((id): id is string => Boolean(id)),
      adminClient,
    ),
  ]);

  const pendingReceived = rows.filter(
    (meeting) =>
      meeting.status === "pending" &&
      meeting.receiver_registration_id === viewer.id,
  );
  const pendingSent = rows.filter(
    (meeting) =>
      meeting.status === "pending" &&
      meeting.requester_registration_id === viewer.id,
  );
  const agenda = rows.filter((meeting) => meeting.status === "accepted");

  const accessQuery = `registrationId=${viewer.id}&token=${token}`;
  const viewerCardSlug =
    viewer.attendee_profiles?.card_visibility !== "private"
      ? viewer.attendee_profiles?.profile_slug
      : null;
  const coverUrl = resolveEventCover(viewer.events.cover_image_url);
  const banner = meetingStatus ? statusMessages[meetingStatus] : undefined;

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <NetworkingNav
        accessQuery={accessQuery}
        active="agenda"
        cardSlug={viewerCardSlug}
        coverUrl={coverUrl}
        eventName={viewer.events.name}
        pendingCount={pendingReceivedCount ?? 0}
        pendingMeetingsCount={pendingReceived.length}
        slug={slug}
      />

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        {banner ? (
          <p
            className={
              banner.tone === "ok"
                ? "mb-5 rounded-2xl border border-brand-aqua-400/50 bg-brand-gradient-soft p-4 text-sm font-semibold text-brand-navy-950"
                : "mb-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700"
            }
          >
            {banner.text}
          </p>
        ) : null}

        <Panel
          icon={<CalendarClock className="size-5" aria-hidden="true" />}
          title="Tu agenda"
        >
          {agenda.length ? (
            agenda.map((meeting) => (
              <MeetingCard
                accessQuery={accessQuery}
                contact={contacts.get(counterpartId(meeting, viewer.id))}
                key={meeting.id}
                locationName={locationName(meeting, locations)}
                meeting={meeting}
                mode="agenda"
                slug={slug}
                viewerId={viewer.id}
              />
            ))
          ) : (
            <EmptyState text="Aun no tienes reuniones aceptadas. Propon una desde el perfil de un asistente en el directorio." />
          )}
        </Panel>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Panel
            title={`Recibidas${pendingReceived.length ? ` (${pendingReceived.length})` : ""}`}
          >
            {pendingReceived.length ? (
              pendingReceived.map((meeting) => (
                <MeetingCard
                  accessQuery={accessQuery}
                  contact={contacts.get(counterpartId(meeting, viewer.id))}
                  key={meeting.id}
                  locationName={locationName(meeting, locations)}
                  meeting={meeting}
                  mode="received"
                  slug={slug}
                  viewerId={viewer.id}
                />
              ))
            ) : (
              <EmptyState text="No tienes propuestas de reunion pendientes." />
            )}
          </Panel>

          <Panel title="Enviadas">
            {pendingSent.length ? (
              pendingSent.map((meeting) => (
                <MeetingCard
                  accessQuery={accessQuery}
                  contact={contacts.get(counterpartId(meeting, viewer.id))}
                  key={meeting.id}
                  locationName={locationName(meeting, locations)}
                  meeting={meeting}
                  mode="sent"
                  slug={slug}
                  viewerId={viewer.id}
                />
              ))
            ) : (
              <EmptyState text="No has propuesto reuniones pendientes." />
            )}
          </Panel>
        </div>
      </section>
    </main>
  );
}

function Panel({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-brand-navy-950">
        {icon ? (
          <span className="text-brand-cyan-500" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {title}
      </h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function MeetingCard({
  accessQuery,
  contact,
  locationName,
  meeting,
  mode,
  slug,
  viewerId,
}: {
  accessQuery: string;
  contact?: Contact;
  locationName: string | null;
  meeting: MeetingRow;
  mode: "agenda" | "received" | "sent";
  slug: string;
  viewerId: string;
}) {
  const isAgenda = mode === "agenda";
  const sentByViewer = meeting.requester_registration_id === viewerId;

  return (
    <article
      className={`rounded-2xl border p-4 transition hover:shadow-md ${
        isAgenda
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
            <p className="mt-0.5 text-sm leading-6 text-brand-slate-600">
              {contact?.role_snapshot ?? "Rol por confirmar"}
              {contact?.company_snapshot
                ? ` en ${contact.company_snapshot}`
                : ""}
            </p>
          </div>
        </div>
        <MeetingBadge status={meeting.status} />
      </div>

      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
        <Clock className="size-4 text-brand-cyan-500" aria-hidden="true" />
        {formatDateTimeRange(meeting.starts_at, meeting.ends_at)}
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-sm text-brand-slate-600">
        <MapPin className="size-4 text-brand-cyan-500" aria-hidden="true" />
        {locationName ?? "Punto de encuentro por definir"}
      </p>

      {meeting.message ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-sm italic leading-6 text-brand-slate-600 shadow-sm">
          “{meeting.message}”
        </p>
      ) : null}

      {mode === "received" ? (
        <div className="mt-4 flex gap-2">
          <form action={acceptMeeting}>
            <HiddenFields
              accessQuery={accessQuery}
              meetingId={meeting.id}
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
          <form action={declineMeeting}>
            <HiddenFields
              accessQuery={accessQuery}
              meetingId={meeting.id}
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

      {mode === "sent" || isAgenda ? (
        <form action={cancelMeeting} className="mt-4">
          <HiddenFields
            accessQuery={accessQuery}
            meetingId={meeting.id}
            slug={slug}
          />
          <button
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            type="submit"
          >
            <X className="size-4" aria-hidden="true" />
            {isAgenda && !sentByViewer ? "Cancelar reunion" : "Cancelar"}
          </button>
        </form>
      ) : null}
    </article>
  );
}

function MeetingBadge({ status }: { status: MeetingStatus }) {
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
      {status === "declined"
        ? "Rechazada"
        : status === "completed"
          ? "Completada"
          : "Cancelada"}
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
  meetingId,
  slug,
}: {
  accessQuery: string;
  meetingId: string;
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
      <input name="meetingId" type="hidden" value={meetingId} />
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

function counterpartId(meeting: MeetingRow, viewerId: string) {
  return meeting.requester_registration_id === viewerId
    ? meeting.receiver_registration_id
    : meeting.requester_registration_id;
}

function locationName(
  meeting: MeetingRow,
  locations: Map<string, string>,
): string | null {
  return meeting.location_id
    ? (locations.get(meeting.location_id) ?? null)
    : null;
}

async function loadContacts(
  ids: string[],
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const uniqueIds = Array.from(new Set(ids));
  const contacts = new Map<string, Contact>();

  if (!uniqueIds.length) {
    return contacts;
  }

  const { data } = await adminClient
    .from("event_registrations")
    .select(
      "id, full_name_snapshot, role_snapshot, company_snapshot, attendee_profiles(avatar_url)",
    )
    .in("id", uniqueIds)
    .returns<Contact[]>();

  data?.forEach((contact) => contacts.set(contact.id, contact));

  return contacts;
}

async function loadLocations(
  ids: string[],
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
) {
  const uniqueIds = Array.from(new Set(ids));
  const locations = new Map<string, string>();

  if (!uniqueIds.length) {
    return locations;
  }

  const { data } = await adminClient
    .from("meeting_locations")
    .select("id, name")
    .in("id", uniqueIds)
    .returns<{ id: string; name: string }[]>();

  data?.forEach((location) => locations.set(location.id, location.name));

  return locations;
}
