import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  IdCard,
  Sparkles,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createConnectionRequest } from "@/app/e/[slug]/connections/actions";
import { proposeMeeting } from "@/app/e/[slug]/meetings/actions";
import { formatDateTimeRange } from "@/lib/datetime";
import { formatMatchReason, scoreMatch } from "@/lib/matchmaking";
import {
  filterUpcomingSlots,
  generateMeetingSlots,
} from "@/lib/meeting-slots";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DirectoryProfileDetail = {
  id: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
  goals_seeking: string[];
  goals_offering: string[];
  attendee_profiles: {
    headline: string | null;
    description: string | null;
    avatar_url: string | null;
    card_visibility: ProfileCardVisibility;
    profile_slug: string | null;
  } | null;
};

export default async function EventDirectoryProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string; slug: string }>;
  searchParams: Promise<{ registrationId?: string; token?: string }>;
}) {
  const { profileId, slug } = await params;
  const { registrationId, token } = await searchParams;
  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer || !viewer.events?.networking_enabled) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("event_registrations")
    .select(
      "id, full_name_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests, goals_seeking, goals_offering, attendee_profiles(headline, description, avatar_url, card_visibility, profile_slug)",
    )
    .eq("id", profileId)
    .eq("event_id", viewer.event_id)
    .eq("public_profile_enabled", true)
    .in("status", ["registered", "checked_in"])
    .single()
    .returns<DirectoryProfileDetail>();

  if (!profile) {
    notFound();
  }

  if (profile.id !== viewer.id) {
    await adminClient.from("profile_views").insert({
      event_id: viewer.event_id,
      viewer_registration_id: viewer.id,
      viewed_registration_id: profile.id,
    });
  }

  // Franjas de 30 min dentro de la ventana del evento (solo futuras) + puntos
  // de encuentro activos, para proponer una reunion 1:1 (Fase 4.2).
  const meetingSlots =
    profile.id !== viewer.id && viewer.events
      ? filterUpcomingSlots(
          generateMeetingSlots({
            eventStartsAt: viewer.events.starts_at,
            eventEndsAt: viewer.events.ends_at,
          }),
        )
      : [];
  const { data: meetingLocations } =
    profile.id !== viewer.id
      ? await adminClient
          .from("meeting_locations")
          .select("id, name")
          .eq("event_id", viewer.event_id)
          .is("archived_at", null)
          .order("created_at", { ascending: true })
          .returns<{ id: string; name: string }[]>()
      : { data: null };

  const { data: existingConnection } = await adminClient
    .from("connection_requests")
    .select("status, requester_registration_id, receiver_registration_id")
    .eq("event_id", viewer.event_id)
    .in("status", ["pending", "accepted"])
    .or(
      [
        `and(requester_registration_id.eq.${viewer.id},receiver_registration_id.eq.${profile.id})`,
        `and(requester_registration_id.eq.${profile.id},receiver_registration_id.eq.${viewer.id})`,
      ].join(","),
    )
    .maybeSingle<{
      requester_registration_id: string;
      receiver_registration_id: string;
      status: "pending" | "accepted";
    }>();

  const accessQuery = `registrationId=${viewer.id}&token=${token}`;
  const isConnected = existingConnection?.status === "accepted";
  // Razones del match contra el viewer (spec 26): concretas, sin porcentaje.
  const matchReasons =
    profile.id !== viewer.id
      ? scoreMatch(
          {
            goalsSeeking: viewer.goals_seeking,
            goalsOffering: viewer.goals_offering,
            interests: viewer.interests,
            industry: viewer.industry_snapshot,
          },
          {
            goalsSeeking: profile.goals_seeking,
            goalsOffering: profile.goals_offering,
            interests: profile.interests,
            industry: profile.industry_snapshot,
          },
        ).reasons
      : [];
  const cardSlug =
    profile.attendee_profiles?.card_visibility !== "private"
      ? profile.attendee_profiles?.profile_slug
      : null;
  const showCardLink =
    cardSlug && (profile.id === viewer.id || isConnected);

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="sticky top-0 z-40 border-b border-brand-border/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Perfil del asistente
            </p>
            <h1 className="text-xl font-semibold text-brand-navy-950">
              {viewer.events.name}
            </h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-brand-border bg-white px-3 py-2 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
            href={`/e/${slug}/directory?${accessQuery}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Directorio
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="relative isolate overflow-hidden px-6 py-10 text-white sm:px-8">
            <div className="absolute inset-0 -z-10 bg-brand-gradient-primary" />
            <div className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-brand-mint-300/20 blur-3xl" />
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {profile.attendee_profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={profile.full_name_snapshot}
                  className="size-24 shrink-0 rounded-2xl border-2 border-white/30 object-cover"
                  src={profile.attendee_profiles.avatar_url}
                />
              ) : (
                <span className="flex size-24 shrink-0 items-center justify-center rounded-2xl border-2 border-white/30 bg-white/10 text-2xl font-semibold">
                  {initials(profile.full_name_snapshot)}
                </span>
              )}
              <div>
                <h2 className="text-3xl font-semibold">
                  {profile.full_name_snapshot}
                </h2>
                <p className="mt-1 text-lg leading-7 text-white/85">
                  {profile.role_snapshot ?? "Rol por confirmar"}
                  {profile.company_snapshot
                    ? ` en ${profile.company_snapshot}`
                    : ""}
                </p>
                {profile.attendee_profiles?.headline ? (
                  <p className="mt-2 leading-7 text-brand-mint-300">
                    {profile.attendee_profiles.headline}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="p-6">
            {profile.attendee_profiles?.description ? (
              <p className="max-w-3xl leading-7 text-brand-slate-600">
                {profile.attendee_profiles.description}
              </p>
            ) : null}

            <div
              className={`grid gap-4 sm:grid-cols-2 ${profile.attendee_profiles?.description ? "mt-6" : ""}`}
            >
              <Info
                icon={<Building2 className="size-5" aria-hidden="true" />}
                label="Empresa u organizacion"
                value={profile.company_snapshot ?? "No informado"}
              />
              <Info
                icon={
                  <BriefcaseBusiness className="size-5" aria-hidden="true" />
                }
                label="Area"
                value={profile.industry_snapshot ?? "No informada"}
              />
            </div>

            {matchReasons.length ? (
              <div className="mt-8 rounded-2xl border border-brand-cyan-500/30 bg-[#eef9f6] p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
                  <Sparkles className="size-4" aria-hidden="true" />
                  Por que conectar
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {matchReasons.map((reason) => (
                    <li
                      className="text-sm font-medium leading-6 text-brand-navy-950"
                      key={reason.type}
                    >
                      {formatMatchReason(reason)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.goals_seeking.length || profile.goals_offering.length ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {profile.goals_seeking.length ? (
                  <GoalList label="Busca" values={profile.goals_seeking} />
                ) : null}
                {profile.goals_offering.length ? (
                  <GoalList label="Ofrece" values={profile.goals_offering} />
                ) : null}
              </div>
            ) : null}

            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
                Intereses
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    className="rounded-full bg-brand-slate-100 px-3 py-1 text-sm font-semibold text-brand-navy-900"
                    key={interest}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {showCardLink ? (
              <Link
                className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:-translate-y-0.5 hover:bg-brand-surface-soft"
                href={`/p/${cardSlug}?source=event`}
              >
                <IdCard className="size-4 text-brand-cyan-500" aria-hidden="true" />
                Ver tarjeta virtual
              </Link>
            ) : null}

            {profile.id !== viewer.id && !existingConnection ? (
              <form
                action={createConnectionRequest}
                className="mt-8 rounded-2xl border border-brand-border bg-brand-gradient-soft p-5"
              >
                <input name="slug" type="hidden" value={slug} />
                <input name="registrationId" type="hidden" value={viewer.id} />
                <input name="token" type="hidden" value={token} />
                <input
                  name="receiverRegistrationId"
                  type="hidden"
                  value={profile.id}
                />
                <p className="text-sm font-semibold text-brand-navy-950">
                  Solicitud de conexion
                </p>
                <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                  Si acepta, ambos recibiran los datos de contacto por email.
                </p>
                <button
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
                  type="submit"
                >
                  <UserRoundPlus className="size-4" aria-hidden="true" />
                  Conectar
                </button>
              </form>
            ) : null}

            {profile.id !== viewer.id && existingConnection ? (
              <div className="mt-8 rounded-2xl border border-brand-border bg-brand-surface-soft p-5">
                <p className="text-sm font-semibold text-brand-navy-950">
                  {isConnected ? "Conexion aceptada" : "Conexion ya solicitada"}
                </p>
                <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                  {connectionStatusText({
                    status: existingConnection.status,
                    viewerId: viewer.id,
                    requesterId: existingConnection.requester_registration_id,
                  })}
                </p>
                <Link
                  className="mt-4 inline-flex h-10 items-center rounded-md border border-brand-border bg-white px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
                  href={`/e/${slug}/connections?${accessQuery}`}
                >
                  Ver conexiones
                </Link>
              </div>
            ) : null}

            {profile.id !== viewer.id && meetingSlots.length ? (
              <form
                action={proposeMeeting}
                className="mt-8 rounded-2xl border border-brand-border bg-brand-surface-soft p-5"
              >
                <input name="slug" type="hidden" value={slug} />
                <input name="registrationId" type="hidden" value={viewer.id} />
                <input name="token" type="hidden" value={token} />
                <input
                  name="receiverRegistrationId"
                  type="hidden"
                  value={profile.id}
                />
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
                  <CalendarClock
                    className="size-4 text-brand-cyan-500"
                    aria-hidden="true"
                  />
                  Proponer una reunion 1:1
                </p>
                <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                  Elige una franja de 30 minutos. Si acepta, quedara en la
                  agenda de ambos.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-brand-navy-950">
                      Franja
                    </span>
                    <select
                      className="mt-2 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                      name="startsAt"
                      required
                    >
                      {meetingSlots.map((slot) => (
                        <option key={slot.startsAt} value={slot.startsAt}>
                          {formatDateTimeRange(slot.startsAt, slot.endsAt)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-brand-navy-950">
                      Punto de encuentro
                    </span>
                    <select
                      className="mt-2 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                      defaultValue=""
                      name="locationId"
                    >
                      <option value="">Por definir</option>
                      {(meetingLocations ?? []).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="text-sm font-medium text-brand-navy-950">
                    Mensaje opcional
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm outline-none transition focus:border-brand-cyan-500"
                    maxLength={280}
                    name="message"
                    placeholder="Cuentale de que te gustaria conversar"
                  />
                </label>
                <button
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
                  type="submit"
                >
                  <CalendarClock className="size-4" aria-hidden="true" />
                  Proponer reunion
                </button>
              </form>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

function connectionStatusText({
  requesterId,
  status,
  viewerId,
}: {
  requesterId: string;
  status: "pending" | "accepted";
  viewerId: string;
}) {
  if (status === "accepted") {
    return "Ya existe una conexion aceptada entre ambos.";
  }

  if (requesterId === viewerId) {
    return "Ya enviaste una solicitud y esta pendiente de respuesta.";
  }

  return "Esta persona ya te envio una solicitud pendiente. Respondela desde Conexiones.";
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

function GoalList({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface-soft p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
        {label}
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => (
          <span
            className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-navy-900"
            key={value}
          >
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-surface-soft p-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-mint-300/40 text-brand-navy-950">
        {icon}
      </span>
      <p className="mt-3 text-sm text-brand-slate-600">{label}</p>
      <p className="mt-1 font-semibold text-brand-navy-950">{value}</p>
    </div>
  );
}
