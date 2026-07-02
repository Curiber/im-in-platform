import {
  ArchiveRestore,
  Building2,
  PauseCircle,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";

import { ActionForm } from "@/app/admin/_components/action-form";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import {
  createOrganization,
  reactivateOrganization,
  suspendOrganization,
} from "@/app/admin/actions";
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
  suspended_at: string | null;
  suspend_reason: string | null;
};

type OrganizationUser = {
  organization_id: string;
  role: "owner" | "admin" | "event_admin";
  user_id: string;
};

type PlatformStats = {
  organizations_total: number;
  organizations_active: number;
  organizations_suspended: number;
  events_total: number;
  events_published: number;
  registrations_active: number;
  registrations_checked_in: number;
  connections_total: number;
  connections_accepted: number;
  meetings_total: number;
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

  // Metricas globales: la RPC valida platform admin desde el JWT, asi que se
  // invoca con la sesion del usuario (no el admin client).
  const { data: statsRows } = await supabase.rpc("platform_stats");
  const stats = (statsRows as PlatformStats[] | null)?.[0] ?? null;

  const adminClient = createSupabaseAdminClient();
  const [{ data: organizations }, { data: memberships }, { data: events }, authUsers] =
    await Promise.all([
      adminClient
        .from("organizations")
        .select(
          "id, name, type, website_url, created_at, suspended_at, suspend_reason",
        )
        .order("created_at", { ascending: false })
        .returns<Organization[]>(),
      adminClient
        .from("organization_users")
        .select("organization_id, role, user_id")
        .order("created_at", { ascending: true })
        .returns<OrganizationUser[]>(),
      adminClient
        .from("events")
        .select("organization_id")
        .is("deleted_at", null)
        .returns<{ organization_id: string }[]>(),
      listAuthUsers(),
    ]);

  const emailByUserId = new Map(
    authUsers.map((authUser) => [authUser.id, authUser.email ?? authUser.id]),
  );
  const eventCountByOrg = new Map<string, number>();
  for (const event of events ?? []) {
    eventCountByOrg.set(
      event.organization_id,
      (eventCountByOrg.get(event.organization_id) ?? 0) + 1,
    );
  }

  return (
    <AdminShell>
      {stats ? (
        <section className="mx-auto w-full max-w-7xl px-5 pt-8 sm:px-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-slate-600">
            Plataforma
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <PlatformMetric
              hint={`${stats.organizations_active} activas · ${stats.organizations_suspended} suspendidas`}
              label="Organizaciones"
              value={stats.organizations_total}
            />
            <PlatformMetric
              hint={`${stats.events_published} publicados`}
              label="Eventos"
              value={stats.events_total}
            />
            <PlatformMetric
              hint={`${stats.registrations_checked_in} acreditados`}
              label="Inscripciones activas"
              value={stats.registrations_active}
            />
            <PlatformMetric
              hint={`${stats.connections_accepted} aceptadas`}
              label="Solicitudes de conexion"
              value={stats.connections_total}
            />
            <PlatformMetric label="Reuniones" value={stats.meetings_total} />
          </div>
        </section>
      ) : null}
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
                  eventCount={eventCountByOrg.get(organization.id) ?? 0}
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

function PlatformMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <article className="rounded-lg border border-brand-border bg-white p-4 shadow-sm">
      <p className="text-sm text-brand-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-brand-navy-950">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-brand-slate-600">{hint}</p>
      ) : null}
    </article>
  );
}

function CreateOrganizationForm() {
  return (
    <ActionForm action={createOrganization} className="mt-5 space-y-4">
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

      <SubmitButton className="h-11 w-full rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900 disabled:opacity-60">
        Crear y asignar owner
      </SubmitButton>
    </ActionForm>
  );
}

function OrganizationRow({
  emailByUserId,
  eventCount,
  memberships,
  organization,
}: {
  emailByUserId: Map<string, string>;
  eventCount: number;
  memberships: OrganizationUser[];
  organization: Organization;
}) {
  const organizationMemberships = memberships.filter(
    (membership) => membership.organization_id === organization.id,
  );
  const ownerEmails = organizationMemberships
    .filter((membership) => membership.role === "owner")
    .map((membership) => emailByUserId.get(membership.user_id) ?? membership.user_id);
  const suspended = Boolean(organization.suspended_at);

  return (
    <div className="p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_220px_150px]">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            {organization.name}
            {suspended ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Suspendida
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-brand-mint-300/40 px-2.5 py-0.5 text-xs font-semibold text-brand-navy-950">
                Activa
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-brand-slate-600">
            {formatOrganizationType(organization.type)}
            {organization.website_url ? ` / ${organization.website_url}` : ""}
            {` · ${eventCount} evento${eventCount === 1 ? "" : "s"}`}
          </p>
          {suspended && organization.suspend_reason ? (
            <p className="mt-1 text-sm text-amber-900">
              Motivo: {organization.suspend_reason}
            </p>
          ) : null}
        </div>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
            <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
            Owners
          </p>
          {ownerEmails.length ? (
            <p className="mt-1 text-sm text-brand-slate-600">
              {ownerEmails.join(", ")}
            </p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-red-700" role="alert">
              Sin owner -- revisar
            </p>
          )}
        </div>
        <p className="text-sm text-brand-slate-600">
          {new Intl.DateTimeFormat("es-CL", {
            dateStyle: "medium",
            timeZone: "America/Santiago",
          }).format(new Date(organization.created_at))}
        </p>
      </div>

      <div className="mt-3">
        {suspended ? (
          <form action={reactivateOrganization}>
            <input
              name="organizationId"
              type="hidden"
              value={organization.id}
            />
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              type="submit"
            >
              <ArchiveRestore className="size-4" aria-hidden="true" />
              Reactivar
            </button>
          </form>
        ) : (
          <details>
            <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-slate-600 transition hover:text-red-700">
              <PauseCircle className="size-4" aria-hidden="true" />
              Suspender organizacion
            </summary>
            <form
              action={suspendOrganization}
              className="mt-3 flex flex-col gap-2 rounded-xl border border-amber-300/70 bg-amber-50/60 p-3 sm:flex-row sm:items-start"
            >
              <input
                name="organizationId"
                type="hidden"
                value={organization.id}
              />
              <textarea
                className="min-h-16 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                name="reason"
                placeholder="Motivo (obligatorio): impago, incumplimiento, solicitud del cliente..."
                required
              />
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-semibold text-white transition hover:bg-amber-700"
                type="submit"
              >
                <PauseCircle className="size-4" aria-hidden="true" />
                Suspender
              </button>
            </form>
            <p className="mt-2 text-xs text-amber-900/80">
              Bloquea paginas publicas e inscripcion de sus eventos y deja su
              panel en solo lectura. Reversible; no borra datos.
            </p>
          </details>
        )}
      </div>
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
