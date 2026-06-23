import { Building2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/app/admin/_components/admin-shell";
import { createOrganization } from "@/app/admin/actions";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Organization = {
  id: string;
  name: string;
  type: string;
  website_url: string | null;
  created_at: string;
};

type OrganizationUser = {
  organization_id: string;
  role: "owner" | "admin" | "event_admin";
  user_id: string;
};

export default async function PlatformOrganizationsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isPlatformAdmin(user)) {
    redirect("/admin");
  }

  const adminClient = createSupabaseAdminClient();
  const [{ data: organizations }, { data: memberships }, authUsers] =
    await Promise.all([
      adminClient
        .from("organizations")
        .select("id, name, type, website_url, created_at")
        .order("created_at", { ascending: false })
        .returns<Organization[]>(),
      adminClient
        .from("organization_users")
        .select("organization_id, role, user_id")
        .order("created_at", { ascending: true })
        .returns<OrganizationUser[]>(),
      listAuthUsers(),
    ]);

  const emailByUserId = new Map(
    authUsers.map((authUser) => [authUser.id, authUser.email ?? authUser.id]),
  );

  return (
    <AdminShell>
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_400px]">
        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-brand-slate-100 text-brand-cyan-500">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
                Organizaciones
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Crear clientes y asignar ownership
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-brand-slate-600">
                Esta vista es solo para administradores de plataforma. Crea una
                organizacion, invita o reutiliza el usuario owner y deja lista
                la relacion en Supabase.
              </p>
            </div>
          </div>

          <div className="mt-8 divide-y divide-brand-border/60 rounded-lg border border-brand-border/60">
            {organizations?.length ? (
              organizations.map((organization) => (
                <OrganizationRow
                  emailByUserId={emailByUserId}
                  key={organization.id}
                  memberships={memberships ?? []}
                  organization={organization}
                />
              ))
            ) : (
              <div className="p-8 text-center">
                <Building2
                  className="mx-auto size-10 text-brand-cyan-500"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-xl font-semibold">
                  Aun no hay organizaciones
                </h3>
                <p className="mt-2 text-sm text-brand-slate-600">
                  Crea la primera organizacion desde el formulario lateral.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="size-5 text-brand-cyan-500" aria-hidden="true" />
            Nueva organizacion
          </h2>
          <CreateOrganizationForm />
        </aside>
      </section>
    </AdminShell>
  );
}

function CreateOrganizationForm() {
  return (
    <form action={createOrganization} className="mt-5 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">
          Nombre organizacion
        </span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          name="name"
          placeholder="Universidad, empresa o comunidad"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">Tipo</span>
        <select
          className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          defaultValue="company"
          name="type"
          required
        >
          <option value="university">Universidad</option>
          <option value="company">Empresa</option>
          <option value="foundation">Fundacion</option>
          <option value="guild">Gremio</option>
          <option value="incubator">Incubadora</option>
          <option value="community">Comunidad</option>
          <option value="producer">Productora</option>
          <option value="public_institution">Institucion publica</option>
          <option value="other">Otro</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-brand-navy-950">
          Sitio web opcional
        </span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
          name="websiteUrl"
          placeholder="https://..."
          type="url"
        />
      </label>

      <div className="rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
        <p className="text-sm font-semibold text-brand-navy-950">Owner inicial</p>
        <p className="mt-1 text-sm leading-6 text-brand-slate-600">
          Si el usuario no existe, se enviara una invitacion por email.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-brand-navy-950">
            Email owner
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
            name="ownerEmail"
            placeholder="owner@empresa.com"
            required
            type="email"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-brand-navy-950">
            Nombre opcional
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
            name="ownerName"
            placeholder="Nombre y apellido"
          />
        </label>
      </div>

      <button
        className="h-11 w-full rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
        type="submit"
      >
        Crear y asignar owner
      </button>
    </form>
  );
}

function OrganizationRow({
  emailByUserId,
  memberships,
  organization,
}: {
  emailByUserId: Map<string, string>;
  memberships: OrganizationUser[];
  organization: Organization;
}) {
  const organizationMemberships = memberships.filter(
    (membership) => membership.organization_id === organization.id,
  );
  const ownerEmails = organizationMemberships
    .filter((membership) => membership.role === "owner")
    .map((membership) => emailByUserId.get(membership.user_id) ?? membership.user_id);

  return (
    <div className="grid gap-4 p-5 md:grid-cols-[1fr_240px_120px]">
      <div>
        <p className="font-semibold">{organization.name}</p>
        <p className="mt-1 text-sm text-brand-slate-600">
          {formatOrganizationType(organization.type)}
          {organization.website_url ? ` / ${organization.website_url}` : ""}
        </p>
      </div>
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
          <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
          Owners
        </p>
        <p className="mt-1 text-sm text-brand-slate-600">
          {ownerEmails.length ? ownerEmails.join(", ") : "Sin owner"}
        </p>
      </div>
      <p className="text-sm text-brand-slate-600">
        {new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
        }).format(new Date(organization.created_at))}
      </p>
    </div>
  );
}

async function listAuthUsers() {
  const adminClient = createSupabaseAdminClient();
  const users: Array<{ email?: string; id: string }> = [];
  let page = 1;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      return users;
    }

    users.push(...data.users.map((user) => ({ email: user.email, id: user.id })));

    if (!data.nextPage) {
      return users;
    }

    page = data.nextPage;
  }

  return users;
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
