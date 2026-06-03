import { Bell, Search, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type DirectoryProfile = {
  id: string;
  full_name_snapshot: string;
  role_snapshot: string | null;
  company_snapshot: string | null;
  industry_snapshot: string | null;
  interests: string[];
};

export default async function EventDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    industry?: string;
    interest?: string;
    q?: string;
    registrationId?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const { industry, interest, q, registrationId, token } = await searchParams;
  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer || !viewer.events?.networking_enabled) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const [{ data: profiles }, { count: pendingReceivedCount }] =
    await Promise.all([
      adminClient
        .from("event_registrations")
        .select(
          "id, full_name_snapshot, role_snapshot, company_snapshot, industry_snapshot, interests",
        )
        .eq("event_id", viewer.event_id)
        .eq("public_profile_enabled", true)
        .neq("status", "cancelled")
        .order("full_name_snapshot", { ascending: true })
        .returns<DirectoryProfile[]>(),
      adminClient
        .from("connection_requests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", viewer.event_id)
        .eq("receiver_registration_id", viewer.id)
        .eq("status", "pending"),
    ]);

  const filteredProfiles = (profiles ?? []).filter((profile) => {
    const query = q?.trim().toLowerCase();
    const matchesQuery = query
      ? [
          profile.full_name_snapshot,
          profile.role_snapshot,
          profile.company_snapshot,
          profile.industry_snapshot,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query))
      : true;

    const matchesIndustry = industry
      ? profile.industry_snapshot === industry
      : true;
    const matchesInterest = interest
      ? profile.interests.includes(interest)
      : true;

    return matchesQuery && matchesIndustry && matchesInterest;
  });

  const industries = unique(
    (profiles ?? []).map((profile) => profile.industry_snapshot),
  );
  const interests = unique(
    (profiles ?? []).flatMap((profile) => profile.interests),
  );
  const accessQuery = `registrationId=${viewer.id}&token=${token}`;

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Directorio privado
            </p>
            <h1 className="text-xl font-semibold">{viewer.events.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/e/${slug}/connections?${accessQuery}`}
          >
            {pendingReceivedCount ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#2f6f4e] px-2 py-0.5 text-xs font-semibold text-white">
                <Bell className="size-3" aria-hidden="true" />
                {pendingReceivedCount}
              </span>
            ) : null}
            Conexiones
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
              Quien esta aqui hoy
            </p>
            <h2 className="mt-1 text-3xl font-semibold">
              Personas disponibles para conectar
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f625d]">
              Solo aparecen asistentes que aceptaron networking y directorio.
            </p>
          </div>

          <div className="rounded-lg border border-[#d9d5cb] bg-white p-4 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#1f2723]">
              <Users className="size-4 text-[#2f6f4e]" aria-hidden="true" />
              {filteredProfiles.length} perfiles visibles
            </p>
          </div>
        </div>

        <form className="mb-5 grid gap-3 rounded-lg border border-[#d9d5cb] bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px_auto]">
          <input name="registrationId" type="hidden" value={viewer.id} />
          <input name="token" type="hidden" value={token} />
          <label className="flex h-11 items-center gap-2 rounded-md border border-[#d9d5cb] bg-white px-3">
            <Search className="size-4 text-[#5f625d]" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              defaultValue={q}
              name="q"
              placeholder="Buscar por nombre, cargo o empresa"
            />
          </label>
          <select
            className="h-11 rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none"
            defaultValue={industry ?? ""}
            name="industry"
          >
            <option value="">Todas las areas</option>
            {industries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none"
            defaultValue={interest ?? ""}
            name="interest"
          >
            <option value="">Todos los intereses</option>
            {interests.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            className="h-11 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
            type="submit"
          >
            Filtrar
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => (
            <Link
              className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm hover:bg-[#fbfaf7]"
              href={`/e/${slug}/directory/${profile.id}?${accessQuery}`}
              key={profile.id}
            >
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
                  <UserRound className="size-6" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">
                    {profile.full_name_snapshot}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#5f625d]">
                    {profile.role_snapshot ?? "Rol por confirmar"}
                    {profile.company_snapshot
                      ? ` en ${profile.company_snapshot}`
                      : ""}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm font-semibold text-[#254f74]">
                {profile.industry_snapshot ?? "Area no informada"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {profile.interests.map((item) => (
                  <span
                    className="rounded-md bg-[#eef6e9] px-2 py-1 text-xs font-semibold text-[#2f6f4e]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>

        {!filteredProfiles.length ? (
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-8 text-center shadow-sm">
            <p className="font-semibold">No hay perfiles para este filtro</p>
            <p className="mt-2 text-sm text-[#5f625d]">
              Prueba con otra busqueda o vuelve a todos los asistentes.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function unique(values: Array<string | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));
}
