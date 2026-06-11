import { Building2, CalendarPlus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/app/admin/sign-out-button";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type OrganizationMembership = {
  role: "owner" | "admin" | "event_admin";
  organizations:
    | {
        id: string;
        name: string;
        type: string;
      }
    | null;
};

export default async function AdminHomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const platformAdmin = isPlatformAdmin(user);
  const { data: memberships, error } = await supabase
    .from("organization_users")
    .select("role, organizations(id, name, type)")
    .order("created_at", { ascending: true })
    .returns<OrganizationMembership[]>();

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <header className="border-b border-brand-border bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-brand-cyan-500">I&apos;m IN</p>
            <h1 className="text-xl font-semibold">Panel organizador</h1>
          </div>
          <SignOutButton />
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-brand-slate-100 text-brand-cyan-500">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
                Sesion activa
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Bienvenido al workspace de eventos
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-brand-slate-600">
                Esta pantalla ya valida al usuario con Supabase Auth desde el
                servidor. El siguiente paso de la epica es crear organizaciones
                y asignar miembros administradores.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ActionCard
              description="Crear y publicar eventos del MVP."
              href="/admin/events"
              icon={<CalendarPlus className="size-5" aria-hidden="true" />}
              title="Eventos"
            />
            <ActionCard
              description="Editar datos basicos de la organizacion."
              href="/admin/settings"
              icon={<Users className="size-5" aria-hidden="true" />}
              title="Configuracion"
            />
            {platformAdmin ? (
              <ActionCard
                description="Crear organizaciones y asignar owners iniciales."
                href="/admin/organizations"
                icon={<Building2 className="size-5" aria-hidden="true" />}
                title="Organizaciones"
              />
            ) : null}
          </div>
        </div>

        <aside className="rounded-lg border border-brand-border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Mis organizaciones</h2>
          <div className="mt-4 space-y-3">
            {error ? (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                No se pudieron cargar las organizaciones.
              </p>
            ) : null}

            {!error && memberships?.length ? (
              memberships.map((membership) => (
                <div
                  className="rounded-md border border-brand-border/60 bg-brand-surface-soft p-4"
                  key={`${membership.organizations?.id}-${membership.role}`}
                >
                  <p className="font-semibold">
                    {membership.organizations?.name ?? "Organizacion"}
                  </p>
                  <p className="mt-1 text-sm text-brand-slate-600">
                    Rol: {formatRole(membership.role)}
                  </p>
                </div>
              ))
            ) : null}

            {!error && !memberships?.length ? (
              <p className="rounded-md bg-brand-surface-soft p-3 text-sm leading-6 text-brand-slate-600">
                Aun no tienes una organizacion asociada. Un platform admin debe
                crear tu organizacion y asignarte como owner.
              </p>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function ActionCard({
  description,
  href,
  icon,
  title,
}: {
  description: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="rounded-md border border-brand-border/60 bg-brand-surface-soft p-4 hover:bg-brand-slate-100"
      href={href}
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-white text-brand-blue-700">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-brand-slate-600">{description}</p>
    </Link>
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
