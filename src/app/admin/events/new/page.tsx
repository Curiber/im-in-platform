import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionForm } from "@/app/admin/_components/action-form";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import { createEvent } from "@/app/admin/events/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Membership = {
  role: "owner" | "admin" | "event_admin";
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export default async function NewEventPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_users")
    .select("role, organization_id, organizations(id, name)")
    .order("created_at", { ascending: true })
    .returns<Membership[]>();

  if (!memberships?.length) {
    redirect("/admin");
  }

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Eventos
          </p>
          <h1 className="mt-1 text-3xl font-semibold">Nuevo evento</h1>
        </div>
        <ActionForm
          action={createEvent}
          className="grid gap-6 rounded-lg border border-brand-border bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">
                Organizacion
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="organizationId"
                required
              >
                {memberships.map((membership) => (
                  <option
                    key={membership.organization_id}
                    value={membership.organization_id}
                  >
                    {membership.organizations?.name ?? "Organizacion"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">
                Nombre del evento
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="name"
                placeholder="Encuentro Alumni 2026"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">
                Descripcion breve
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-brand-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-cyan-500"
                name="description"
                placeholder="Describe el foco del evento en una o dos frases."
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Fecha y hora de inicio
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="startsAt"
                type="datetime-local"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Hora de llegada
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="arrivalStartsAt"
                type="datetime-local"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Hora de termino
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="endsAt"
                type="datetime-local"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">Cupos</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                min="1"
                name="capacity"
                placeholder="120"
                type="number"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">Lugar</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="location"
                placeholder="Campus, hotel, centro de eventos o link online"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Modalidad
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="modality"
                defaultValue="in_person"
                required
              >
                <option value="in_person">Presencial</option>
                <option value="online">Online</option>
                <option value="hybrid">Hibrido</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Tipo de evento
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                name="eventType"
                defaultValue="open"
                required
              >
                <option value="open">Abierto</option>
                <option value="closed">Cerrado</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
            <input
              className="mt-1 size-4"
              name="networkingEnabled"
              type="checkbox"
              defaultChecked
            />
            <span>
              <span className="block text-sm font-semibold text-brand-navy-950">
                Activar networking
              </span>
              <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                Permite perfil publico, directorio y solicitudes de conexion
                para este evento.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
              href="/admin/events"
            >
              Cancelar
            </Link>
            <SubmitButton className="h-11 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white hover:bg-brand-navy-900 disabled:opacity-60">
              Crear borrador
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </AdminShell>
  );
}
