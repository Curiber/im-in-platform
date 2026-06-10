import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateEvent } from "@/app/admin/events/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type EditableEvent = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  starts_at: string;
  arrival_starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  capacity: number;
  event_type: "open" | "closed";
  modality: "in_person" | "online" | "hybrid";
  networking_enabled: boolean;
};

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, organization_id, name, description, starts_at, arrival_starts_at, ends_at, location, capacity, event_type, modality, networking_enabled",
    )
    .eq("id", eventId)
    .is("deleted_at", null)
    .single()
    .returns<EditableEvent>();

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">Eventos</p>
            <h1 className="text-xl font-semibold">Editar evento</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/admin/events/${event.id}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8">
        <form
          action={updateEvent}
          className="grid gap-6 rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm"
        >
          <input name="eventId" type="hidden" value={event.id} />
          <input
            name="organizationId"
            type="hidden"
            value={event.organization_id}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-[#1f2723]">
                Nombre del evento
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.name}
                name="name"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-[#1f2723]">
                Descripcion breve
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-[#d9d5cb] bg-white px-3 py-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.description ?? ""}
                name="description"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">
                Fecha y hora de inicio
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={toDateTimeLocal(event.starts_at)}
                name="startsAt"
                type="datetime-local"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">
                Hora de llegada
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={toDateTimeLocal(event.arrival_starts_at)}
                name="arrivalStartsAt"
                type="datetime-local"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">
                Hora de termino
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={toDateTimeLocal(event.ends_at)}
                name="endsAt"
                type="datetime-local"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">Cupos</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.capacity}
                min="1"
                name="capacity"
                type="number"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-[#1f2723]">Lugar</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.location ?? ""}
                name="location"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">
                Modalidad
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.modality}
                name="modality"
                required
              >
                <option value="in_person">Presencial</option>
                <option value="online">Online</option>
                <option value="hybrid">Hibrido</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#1f2723]">
                Tipo de evento
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={event.event_type}
                name="eventType"
                required
              >
                <option value="open">Abierto</option>
                <option value="closed">Cerrado</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
            <input
              className="mt-1 size-4"
              defaultChecked={event.networking_enabled}
              name="networkingEnabled"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-[#1f2723]">
                Activar networking
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#5f625d]">
                Permite perfil publico, directorio y solicitudes de conexion.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
              href={`/admin/events/${event.id}`}
            >
              Cancelar
            </Link>
            <button
              className="h-11 rounded-md bg-[#102923] px-5 text-sm font-semibold text-white hover:bg-[#183b33]"
              type="submit"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}
