import { Building2, Mail, Save, Trash2, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/app/admin/_components/admin-shell";
import {
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  updateOrganizationSettings,
} from "@/app/admin/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
    <AdminShell>
      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Organizacion
          </p>
          <h2 className="mt-1 text-3xl font-semibold">
            Datos de la empresa
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate-600">
            Estos datos se usan en el panel, paginas publicas de eventos y
            comunicaciones futuras.
          </p>
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            No se pudieron cargar tus organizaciones.
          </p>
        ) : null}

        {!error && memberships?.length ? (
          <div className="space-y-8">
            {memberships.map((membership) =>
              membership.organizations ? (
                <div className="space-y-4" key={membership.organizations.id}>
                  <OrganizationSettingsForm membership={membership} />
                  <MembersPanel
                    organizationId={membership.organizations.id}
                    viewerRole={membership.role}
                  />
                </div>
              ) : null,
            )}
          </div>
        ) : null}

        {!error && !memberships?.length ? (
          <div className="rounded-lg border border-brand-border bg-white p-8 text-center shadow-sm">
            <Building2
              className="mx-auto size-10 text-brand-cyan-500"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">
              No tienes organizaciones
            </h2>
            <p className="mt-2 text-sm text-brand-slate-600">
              Crea una organizacion desde el panel principal para configurar sus
              datos.
            </p>
          </div>
        ) : null}
      </section>
    </AdminShell>
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
      className="rounded-lg border border-brand-border bg-white p-5 shadow-sm"
    >
      <input name="organizationId" type="hidden" value={organization.id} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-cyan-500">
            {formatOrganizationType(organization.type)}
          </p>
          <h3 className="mt-1 text-xl font-semibold">{organization.name}</h3>
          <p className="mt-1 text-sm text-brand-slate-600">
            Rol: {formatRole(membership.role)}
          </p>
        </div>
        {!canEdit ? (
          <span className="inline-flex rounded-md bg-brand-surface-soft px-3 py-1 text-sm font-semibold text-brand-slate-600">
            Solo lectura
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-brand-navy-950">Nombre</span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 disabled:bg-brand-surface-soft disabled:text-brand-slate-600"
            defaultValue={organization.name}
            disabled={!canEdit}
            name="name"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-brand-navy-950">
            Sitio web
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500 disabled:bg-brand-surface-soft disabled:text-brand-slate-600"
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
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
          type="submit"
        >
          <Save className="size-4" aria-hidden="true" />
          Guardar cambios
        </button>
      ) : (
        <p className="mt-5 rounded-md bg-brand-surface-soft p-3 text-sm leading-6 text-brand-slate-600">
          Solo owners y admins pueden editar los datos de la organizacion.
        </p>
      )}
    </form>
  );
}

type Member = { user_id: string; role: "owner" | "admin" | "event_admin" };

async function MembersPanel({
  organizationId,
  viewerRole,
}: {
  organizationId: string;
  viewerRole: "owner" | "admin" | "event_admin";
}) {
  if (viewerRole !== "owner" && viewerRole !== "admin") {
    return null;
  }

  const adminClient = createSupabaseAdminClient();
  const { data: members } = await adminClient
    .from("organization_users")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .returns<Member[]>();

  const emails = new Map<string, string>();
  await Promise.all(
    (members ?? []).map(async (member) => {
      const { data } = await adminClient.auth.admin.getUserById(member.user_id);

      if (data.user?.email) {
        emails.set(member.user_id, data.user.email);
      }
    }),
  );

  const isOwner = viewerRole === "owner";

  return (
    <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <UserPlus className="size-5 text-brand-cyan-500" aria-hidden="true" />
        Equipo
      </h3>
      <p className="mt-1 text-sm text-brand-slate-600">
        Invita miembros y define su rol. Los owners se gestionan aparte.
      </p>

      <div className="mt-4 space-y-2">
        {(members ?? []).map((member) => (
          <div
            className="flex flex-col gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-3 sm:flex-row sm:items-center sm:justify-between"
            key={member.user_id}
          >
            <p className="flex items-center gap-2 text-sm font-medium text-brand-navy-950">
              <Mail className="size-4 text-brand-cyan-500" aria-hidden="true" />
              {emails.get(member.user_id) ?? member.user_id}
            </p>
            {member.role === "owner" ? (
              <span className="inline-flex h-9 items-center self-start rounded-lg bg-brand-navy-950 px-3 text-sm font-semibold text-brand-mint-300">
                Owner
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <form action={updateOrganizationMemberRole}>
                  <input name="organizationId" type="hidden" value={organizationId} />
                  <input name="userId" type="hidden" value={member.user_id} />
                  <select
                    className="h-9 rounded-lg border border-brand-border bg-white px-2 text-sm outline-none focus:border-brand-cyan-500"
                    defaultValue={member.role}
                    name="role"
                  >
                    <option value="admin">Admin</option>
                    <option value="event_admin">Admin de evento</option>
                  </select>
                  <button
                    className="ml-2 inline-flex h-9 items-center rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-white"
                    type="submit"
                  >
                    Guardar
                  </button>
                </form>
                {isOwner ? (
                  <form action={removeOrganizationMember}>
                    <input name="organizationId" type="hidden" value={organizationId} />
                    <input name="userId" type="hidden" value={member.user_id} />
                    <button
                      aria-label="Quitar miembro"
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-brand-border bg-white text-red-700 transition hover:bg-brand-surface-soft"
                      type="submit"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      <form
        action={addOrganizationMember}
        className="mt-4 grid gap-3 rounded-xl border border-brand-border/60 bg-brand-surface-soft p-4 sm:grid-cols-[1fr_180px_auto]"
      >
        <input name="organizationId" type="hidden" value={organizationId} />
        <input
          className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          name="email"
          placeholder="email@empresa.com"
          required
          type="email"
        />
        <select
          className="h-10 rounded-lg border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          defaultValue="event_admin"
          name="role"
        >
          <option value="admin">Admin</option>
          <option value="event_admin">Admin de evento</option>
        </select>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
          type="submit"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Invitar
        </button>
      </form>
    </div>
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
