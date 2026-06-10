import { ArrowLeft, Building2, Save } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { updateOrganizationSettings } from "@/app/admin/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrganizationMembership = {
  role: "owner" | "admin" | "event_admin";
  organizations:
    | {
        id: string;
        name: string;
        type: string;
        website_url: string | null;
      }
    | null;
};

export default async function AdminSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("organization_users")
    .select("role, organizations(id, name, type, website_url)")
    .order("created_at", { ascending: true })
    .returns<OrganizationMembership[]>();

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">I&apos;m IN</p>
            <h1 className="text-xl font-semibold">Configuracion</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href="/admin"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
            Organizacion
          </p>
          <h2 className="mt-1 text-3xl font-semibold">
            Datos de la empresa
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f625d]">
            Estos datos se usan en el panel, paginas publicas de eventos y
            comunicaciones futuras.
          </p>
        </div>

        {error ? (
          <p className="rounded-md bg-[#f8ded8] p-4 text-sm text-[#8a2f24]">
            No se pudieron cargar tus organizaciones.
          </p>
        ) : null}

        {!error && memberships?.length ? (
          <div className="space-y-4">
            {memberships.map((membership) =>
              membership.organizations ? (
                <OrganizationSettingsForm
                  key={membership.organizations.id}
                  membership={membership}
                />
              ) : null,
            )}
          </div>
        ) : null}

        {!error && !memberships?.length ? (
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-8 text-center shadow-sm">
            <Building2
              className="mx-auto size-10 text-[#2f6f4e]"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">
              No tienes organizaciones
            </h2>
            <p className="mt-2 text-sm text-[#5f625d]">
              Crea una organizacion desde el panel principal para configurar sus
              datos.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OrganizationSettingsForm({
  membership,
}: {
  membership: OrganizationMembership;
}) {
  const organization = membership.organizations;
  const canEdit = membership.role === "owner" || membership.role === "admin";

  if (!organization) {
    return null;
  }

  return (
    <form
      action={updateOrganizationSettings}
      className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm"
    >
      <input name="organizationId" type="hidden" value={organization.id} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#2f6f4e]">
            {formatOrganizationType(organization.type)}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{organization.name}</h3>
          <p className="mt-1 text-sm text-[#5f625d]">
            Rol: {formatRole(membership.role)}
          </p>
        </div>
        {!canEdit ? (
          <span className="inline-flex rounded-md bg-[#f6f4ef] px-3 py-1 text-sm font-semibold text-[#5f625d]">
            Solo lectura
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-[#1f2723]">Nombre</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e] disabled:bg-[#f6f4ef] disabled:text-[#5f625d]"
            defaultValue={organization.name}
            disabled={!canEdit}
            name="name"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[#1f2723]">
            Sitio web
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e] disabled:bg-[#f6f4ef] disabled:text-[#5f625d]"
            defaultValue={organization.website_url ?? ""}
            disabled={!canEdit}
            name="websiteUrl"
            placeholder="https://..."
            type="url"
          />
        </label>
      </div>

      {canEdit ? (
        <button
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
          type="submit"
        >
          <Save className="size-4" aria-hidden="true" />
          Guardar cambios
        </button>
      ) : (
        <p className="mt-5 rounded-md bg-[#fbfaf7] p-3 text-sm leading-6 text-[#5f625d]">
          Solo owners y admins pueden editar los datos de la organizacion.
        </p>
      )}
    </form>
  );
}

function formatRole(role: OrganizationMembership["role"]) {
  const labels = {
    owner: "Owner",
    admin: "Admin",
    event_admin: "Admin de evento",
  };

  return labels[role];
}

function formatOrganizationType(type: string) {
  const labels: Record<string, string> = {
    university: "Universidad",
    company: "Empresa",
    foundation: "Fundacion",
    guild: "Gremio",
    incubator: "Incubadora",
    community: "Comunidad",
    producer: "Productora",
    public_institution: "Institucion publica",
    other: "Organizacion",
  };

  return labels[type] ?? "Organizacion";
}
