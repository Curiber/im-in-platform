"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const eventSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(3, "Ingresa el nombre del evento."),
  description: z.string().trim().optional(),
  startsAt: z.coerce.date(),
  arrivalStartsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  location: z.string().trim().min(2, "Ingresa el lugar del evento."),
  modality: z.enum(["in_person", "online", "hybrid"]),
  capacity: z.coerce.number().int().positive(),
  eventType: z.enum(["open", "closed"]),
  networkingEnabled: z.boolean(),
});

export async function createEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = eventSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: formData.get("startsAt"),
    arrivalStartsAt: emptyToNull(formData.get("arrivalStartsAt")),
    endsAt: emptyToNull(formData.get("endsAt")),
    location: String(formData.get("location") ?? ""),
    modality: formData.get("modality"),
    capacity: formData.get("capacity"),
    eventType: formData.get("eventType"),
    networkingEnabled: formData.get("networkingEnabled") === "on",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const slug = `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 8)}`;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      starts_at: parsed.data.startsAt.toISOString(),
      arrival_starts_at: parsed.data.arrivalStartsAt?.toISOString() ?? null,
      ends_at: parsed.data.endsAt?.toISOString() ?? null,
      location: parsed.data.location,
      modality: parsed.data.modality,
      capacity: parsed.data.capacity,
      event_type: parsed.data.eventType,
      networking_enabled: parsed.data.networkingEnabled,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) {
    throw new Error("No se pudo crear el evento.");
  }

  revalidatePath("/admin/events");
  redirect(`/admin/events/${event.id}`);
}

export async function publishEvent(formData: FormData) {
  await updateEventStatus(formData, "published");
}

export async function closeEvent(formData: FormData) {
  await updateEventStatus(formData, "closed");
}

async function updateEventStatus(
  formData: FormData,
  status: "published" | "closed",
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = String(formData.get("eventId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!eventId) {
    throw new Error("Evento invalido.");
  }

  const { error } = await supabase
    .from("events")
    .update({ status })
    .eq("id", eventId);

  if (error) {
    throw new Error("No se pudo actualizar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);

  if (slug) {
    revalidatePath(`/e/${slug}`);
  }
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (!value || String(value).trim() === "") {
    return null;
  }

  return value;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
