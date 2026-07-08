import { ImageOff, ImageUp } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  removeEventCover,
  updateEvent,
  uploadEventCover,
} from "@/app/admin/events/actions";
import { ActionForm } from "@/app/admin/_components/action-form";
import { AdminShell } from "@/app/admin/_components/admin-shell";
import {
  EventProfileOptionsManager,
  type ProfileOptionRow,
} from "@/app/admin/events/[eventId]/edit/_components/profile-options-manager";
import { SubmitButton } from "@/app/admin/_components/submit-button";
import { toDateTimeLocalValue } from "@/lib/datetime";
import { DEFAULT_EVENT_COVER } from "@/lib/event-cover";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CoverStatus = "uploaded" | "removed" | "missing" | "invalid" | "error";

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
  registration_mode: "open" | "approval";
  modality: "in_person" | "online" | "hybrid";
  networking_enabled: boolean;
  discoverable: boolean;
  cover_image_url: string | null;
};

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ coverStatus?: CoverStatus }>;
}) {
  const { eventId } = await params;
  const { coverStatus } = await searchParams;
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
      "id, organization_id, name, description, starts_at, arrival_starts_at, ends_at, location, capacity, event_type, registration_mode, modality, networking_enabled, discoverable, cover_image_url",
    )
    .eq("id", eventId)
    .is("deleted_at", null)
    .single()
    .returns<EditableEvent>();

  if (!event) {
    notFound();
  }

  const { data: optionRows } = await supabase
    .from("event_profile_options")
    .select("id, kind, label")
    .eq("event_id", event.id)
    .order("position", { ascending: true })
    .order("label", { ascending: true })
    .returns<
      { id: string; kind: "industry" | "interest" | "goal"; label: string }[]
    >();

  const industryOptions: ProfileOptionRow[] = (optionRows ?? [])
    .filter((row) => row.kind === "industry")
    .map((row) => ({ id: row.id, label: row.label }));
  const interestOptions: ProfileOptionRow[] = (optionRows ?? [])
    .filter((row) => row.kind === "interest")
    .map((row) => ({ id: row.id, label: row.label }));
  const goalOptions: ProfileOptionRow[] = (optionRows ?? [])
    .filter((row) => row.kind === "goal")
    .map((row) => ({ id: row.id, label: row.label }));

  return (
    <AdminShell>
      <section className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Editar evento
          </p>
          <h1 className="mt-1 text-3xl font-semibold">{event.name}</h1>
        </div>
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          <div className="relative h-44 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Portada del evento"
              className="size-full object-cover"
              src={event.cover_image_url ?? DEFAULT_EVENT_COVER}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy-950/70 to-transparent" />
            <span className="absolute bottom-3 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-brand-navy-950">
              {event.cover_image_url ? "Portada del evento" : "Portada por defecto"}
            </span>
          </div>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-navy-950">
                Foto de portada
              </p>
              <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                JPG, PNG o WebP, hasta 5 MB. Se muestra en la pagina publica del
                evento. Si no subes una, usamos una portada por defecto.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <form
                action={uploadEventCover}
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
              >
                <input name="eventId" type="hidden" value={event.id} />
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-sm text-brand-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-brand-surface-soft file:px-4 file:text-sm file:font-semibold file:text-brand-navy-950"
                  name="cover"
                  required
                  type="file"
                />
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                  type="submit"
                >
                  <ImageUp className="size-4" aria-hidden="true" />
                  Subir portada
                </button>
              </form>
              {event.cover_image_url ? (
                <form action={removeEventCover}>
                  <input name="eventId" type="hidden" value={event.id} />
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-brand-border px-3 text-sm font-semibold text-brand-slate-600 transition hover:bg-brand-surface-soft"
                    type="submit"
                  >
                    <ImageOff className="size-4" aria-hidden="true" />
                    Quitar portada
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          {coverStatus ? (
            <p
              className={`px-5 pb-5 text-sm font-semibold ${
                coverStatus === "uploaded" || coverStatus === "removed"
                  ? "text-brand-cyan-500"
                  : "text-red-700"
              }`}
            >
              {formatCoverStatus(coverStatus)}
            </p>
          ) : null}
        </div>

        <ActionForm
          action={updateEvent}
          className="grid gap-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm"
        >
          <input name="eventId" type="hidden" value={event.id} />
          <input
            name="organizationId"
            type="hidden"
            value={event.organization_id}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">
                Nombre del evento
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.name}
                name="name"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">
                Descripcion breve
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-brand-border bg-white px-3 py-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.description ?? ""}
                name="description"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Fecha y hora de inicio
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={toDateTimeLocalValue(event.starts_at)}
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
                defaultValue={toDateTimeLocalValue(event.arrival_starts_at)}
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
                defaultValue={toDateTimeLocalValue(event.ends_at)}
                name="endsAt"
                type="datetime-local"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">Cupos</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.capacity}
                min="1"
                name="capacity"
                type="number"
                required
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-brand-navy-950">Lugar</span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.location ?? ""}
                name="location"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Modalidad
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
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
              <span className="text-sm font-medium text-brand-navy-950">
                Tipo de evento
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.event_type}
                name="eventType"
                required
              >
                <option value="open">Abierto</option>
                <option value="closed">Cerrado</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-brand-navy-950">
                Modo de inscripcion
              </span>
              <select
                className="mt-2 h-11 w-full rounded-md border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
                defaultValue={event.registration_mode}
                name="registrationMode"
                required
              >
                <option value="open">Abierta (acceso inmediato)</option>
                <option value="approval">Con aprobacion del organizador</option>
              </select>
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
            <input
              className="mt-1 size-4"
              defaultChecked={event.networking_enabled}
              name="networkingEnabled"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-brand-navy-950">
                Activar networking
              </span>
              <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                Permite perfil publico, directorio y solicitudes de conexion.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
            <input
              className="mt-1 size-4"
              defaultChecked={event.discoverable}
              name="discoverable"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-brand-navy-950">
                Listar en Explorar
              </span>
              <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                Muestra el evento en el explorador de I&apos;m IN. Desactivado,
                el evento solo es accesible por su link.
              </span>
            </span>
          </label>

          <div className="flex justify-end gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
              href={`/admin/events/${event.id}`}
            >
              Cancelar
            </Link>
            <SubmitButton className="h-11 rounded-md bg-brand-navy-950 px-5 text-sm font-semibold text-white hover:bg-brand-navy-900 disabled:opacity-60">
              Guardar cambios
            </SubmitButton>
          </div>
        </ActionForm>

        <EventProfileOptionsManager
          eventId={event.id}
          goals={goalOptions}
          industries={industryOptions}
          interests={interestOptions}
        />
      </section>
    </AdminShell>
  );
}

function formatCoverStatus(status: CoverStatus) {
  const labels: Record<CoverStatus, string> = {
    uploaded: "Portada actualizada correctamente.",
    removed: "Portada eliminada. Se usara la portada por defecto.",
    missing: "Selecciona una imagen antes de subir.",
    invalid: "La portada debe ser JPG, PNG o WebP y pesar maximo 5 MB.",
    error: "No pudimos actualizar la portada. Intentalo nuevamente.",
  };

  return labels[status];
}
