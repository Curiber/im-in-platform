import { Building2, ShieldCheck, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createOrganization } from "@/app/admin/actions";
import { SignOutButton } from "@/app/admin/sign-out-button";
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
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/admin">
            <p className="text-sm font-semibold text-[#2f6f4e]">I&apos;m IN</p>
            <h1 className="text-xl font-semibold">Platform admin</h1>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              className="rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
              href="/admin"
            >
              Panel
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_400px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
                Organizaciones
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Crear clientes y asignar ownership
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#4a4d49]">
                Esta vista es solo para administradores de plataforma. Crea una
                organizacion, invita o reutiliza el usuario owner y deja lista
                la relacion en Supabase.
              </p>
            </div>
          </div>

          <div className="mt-8 divide-y divide-[#e5e0d6] rounded-lg border border-[#e5e0d6]">
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
                  className="mx-auto size-10 text-[#2f6f4e]"
                  aria-hidden="true"
                />
                <h3 className="mt-4 text-xl font-semibold">
                  Aun no hay organizaciones
                </h3>
                <p className="mt-2 text-sm text-[#5f625d]">
                  Crea la primera organizacion desde el formulario lateral.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserPlus className="size-5 text-[#2f6f4e]" aria-hidden="true" />
            Nueva organizacion
          </h2>
          <CreateOrganizationForm />
        </aside>
      </section>
    </main>
  );
}

function CreateOrganizationForm() {
  return (
    <form action={createOrganization} className="mt-5 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-[#1f2723]">
          Nombre organizacion
        </span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
          name="name"
          placeholder="Universidad, empresa o comunidad"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[#1f2723]">Tipo</span>
        <select
          className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
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
        <span className="text-sm font-medium text-[#1f2723]">
          Sitio web opcional
        </span>
        <input
          className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
          name="websiteUrl"
          placeholder="https://..."
          type="url"
        />
      </label>

      <div className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
        <p className="text-sm font-semibold text-[#1f2723]">Owner inicial</p>
        <p className="mt-1 text-sm leading-6 text-[#5f625d]">
          Si el usuario no existe, se enviara una invitacion por email.
        </p>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-[#1f2723]">
            Email owner
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
            name="ownerEmail"
            placeholder="owner@empresa.com"
            required
            type="email"
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-[#1f2723]">
            Nombre opcional
          </span>
          <input
            className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
            name="ownerName"
            placeholder="Nombre y apellido"
          />
        </label>
      </div>

      <button
        className="h-11 w-full rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
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
        <p className="mt-1 text-sm text-[#5f625d]">
          {formatOrganizationType(organization.type)}
          {organization.website_url ? ` / ${organization.website_url}` : ""}
        </p>
      </div>
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-[#1f2723]">
          <Users className="size-4 text-[#2f6f4e]" aria-hidden="true" />
          Owners
        </p>
        <p className="mt-1 text-sm text-[#5f625d]">
          {ownerEmails.length ? ownerEmails.join(", ") : "Sin owner"}
        </p>
      </div>
      <p className="text-sm text-[#5f625d]">
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
