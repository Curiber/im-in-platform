import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { createConnectionRequest } from "@/app/e/[slug]/connections/actions";
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
      "id, full_name_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests",
    )
    .eq("id", profileId)
    .eq("event_id", viewer.event_id)
    .eq("public_profile_enabled", true)
    .neq("status", "cancelled")
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

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Perfil del asistente
            </p>
            <h1 className="text-xl font-semibold">{viewer.events.name}</h1>
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
        <article className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
              <UserRound className="size-9" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-3xl font-semibold">
                {profile.full_name_snapshot}
              </h2>
              <p className="mt-2 text-lg leading-7 text-[#4a4d49]">
                {profile.role_snapshot ?? "Rol por confirmar"}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Info
              icon={<Building2 className="size-5" aria-hidden="true" />}
              label="Empresa u organizacion"
              value={profile.company_snapshot ?? "No informado"}
            />
            <Info
              icon={<BriefcaseBusiness className="size-5" aria-hidden="true" />}
              label="Area"
              value={profile.industry_snapshot ?? "No informada"}
            />
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
              Intereses
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  className="rounded-md bg-[#eef6e9] px-3 py-1 text-sm font-semibold text-[#2f6f4e]"
                  key={interest}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {profile.id !== viewer.id && !existingConnection ? (
            <form
              action={createConnectionRequest}
              className="mt-8 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4"
            >
              <input name="slug" type="hidden" value={slug} />
              <input name="registrationId" type="hidden" value={viewer.id} />
              <input name="token" type="hidden" value={token} />
              <input
                name="receiverRegistrationId"
                type="hidden"
                value={profile.id}
              />
              <p className="text-sm font-semibold text-[#1f2723]">
                Solicitud de conexion
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5f625d]">
                Si acepta, ambos recibiran los datos de contacto por email.
              </p>
              <button
                className="mt-4 h-10 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
                type="submit"
              >
                Conectar
              </button>
            </form>
          ) : null}

          {profile.id !== viewer.id && existingConnection ? (
            <div className="mt-8 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
              <p className="text-sm font-semibold text-[#1f2723]">
                Conexion ya solicitada
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5f625d]">
                {connectionStatusText({
                  status: existingConnection.status,
                  viewerId: viewer.id,
                  requesterId: existingConnection.requester_registration_id,
                })}
              </p>
              <Link
                className="mt-4 inline-flex h-10 items-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-white"
                href={`/e/${slug}/connections?${accessQuery}`}
              >
                Ver conexiones
              </Link>
            </div>
          ) : null}
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
    <div className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
      <span className="text-[#2f6f4e]">{icon}</span>
      <p className="mt-3 text-sm text-[#5f625d]">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
