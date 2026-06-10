import { CalendarPlus, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createOrganization } from "@/app/admin/actions";
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

  const { data: memberships, error } = await supabase
    .from("organization_users")
    .select("role, organizations(id, name, type)")
    .order("created_at", { ascending: true })
    .returns<OrganizationMembership[]>();

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">I&apos;m IN</p>
            <h1 className="text-xl font-semibold">Panel organizador</h1>
          </div>
          <form action="/auth/sign-out" method="post">
            <button
              className="rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
              type="submit"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="flex size-11 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
                Sesion activa
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Bienvenido al workspace de eventos
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-[#4a4d49]">
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
          </div>
        </div>

        <aside className="rounded-lg border border-[#d9d5cb] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Mis organizaciones</h2>
          <div className="mt-4 space-y-3">
            {error ? (
              <p className="rounded-md bg-[#f8ded8] p-3 text-sm text-[#8a2f24]">
                No se pudieron cargar las organizaciones.
              </p>
            ) : null}

            {!error && memberships?.length ? (
              memberships.map((membership) => (
                <div
                  className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4"
                  key={`${membership.organizations?.id}-${membership.role}`}
                >
                  <p className="font-semibold">
                    {membership.organizations?.name ?? "Organizacion"}
                  </p>
                  <p className="mt-1 text-sm text-[#5f625d]">
                    Rol: {formatRole(membership.role)}
                  </p>
                </div>
              ))
            ) : null}

            {!error && !memberships?.length ? (
              <CreateOrganizationForm />
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function CreateOrganizationForm() {
  return (
    <form action={createOrganization} className="space-y-4">
      <p className="rounded-md bg-[#fbfaf7] p-3 text-sm leading-6 text-[#5f625d]">
        Aun no tienes una organizacion asociada. Crea el workspace inicial para
        operar eventos.
      </p>

      <label className="block">
        <span className="text-sm font-medium text-[#1f2723]">Nombre</span>
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
          name="type"
          defaultValue="company"
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

      <button
        className="h-11 w-full rounded-md bg-[#102923] px-4 text-sm font-semibold text-white hover:bg-[#183b33]"
        type="submit"
      >
        Crear organizacion
      </button>
    </form>
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
      className="rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4 hover:bg-[#f4f1e9]"
      href={href}
    >
      <span className="flex size-9 items-center justify-center rounded-md bg-white text-[#254f74]">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5f625d]">{description}</p>
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
