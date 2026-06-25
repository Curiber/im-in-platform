import { Building2, Mail, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/app/admin/_components/admin-shell";
import { OrganizationSettingsForm } from "@/app/admin/settings/_components/organization-settings-form";
import {
  AddMemberForm,
  RemoveMemberForm,
  UpdateMemberRoleForm,
} from "@/app/admin/settings/_components/member-forms";
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
                  <OrganizationSettingsForm
                    organization={membership.organizations}
                    role={membership.role}
                  />
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
              <div className="flex items-start gap-2">
                <UpdateMemberRoleForm
                  defaultRole={member.role === "admin" ? "admin" : "event_admin"}
                  organizationId={organizationId}
                  userId={member.user_id}
                />
                {isOwner ? (
                  <RemoveMemberForm
                    organizationId={organizationId}
                    userId={member.user_id}
                  />
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      <AddMemberForm organizationId={organizationId} />
    </div>
  );
}
