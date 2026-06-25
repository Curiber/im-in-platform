"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { removeStaleFiles } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const EVENT_COVER_BUCKET = "event-covers";
const allowedCoverTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

async function authorizeEventManager(eventId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organization_id, slug")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<{ id: string; organization_id: string; slug: string }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (!membership) {
    throw new Error("No tienes permisos sobre este evento.");
  }

  return event;
}

export async function uploadEventCover(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");

  if (!eventId) {
    throw new Error("Evento invalido.");
  }

  const event = await authorizeEventManager(eventId);
  const redirectPath = `/admin/events/${eventId}/edit`;
  const file = formData.get("cover");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${redirectPath}?coverStatus=missing`);
  }

  const extension = allowedCoverTypes.get(file.type);

  if (!extension || file.size > MAX_COVER_BYTES) {
    redirect(`${redirectPath}?coverStatus=invalid`);
  }

  const adminClient = createSupabaseAdminClient();
  const folder = `events/${eventId}`;
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const storagePath = `${folder}/${fileName}`;

  const { error: uploadError } = await adminClient.storage
    .from(EVENT_COVER_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    redirect(`${redirectPath}?coverStatus=error`);
  }

  const { data } = adminClient.storage
    .from(EVENT_COVER_BUCKET)
    .getPublicUrl(storagePath);

  const { error: updateError } = await adminClient
    .from("events")
    .update({ cover_image_url: data.publicUrl })
    .eq("id", eventId);

  if (updateError) {
    redirect(`${redirectPath}?coverStatus=error`);
  }

  // La portada nueva ya quedo persistida: borra las anteriores del bucket.
  await removeStaleFiles(adminClient, EVENT_COVER_BUCKET, folder, fileName);

  revalidatePath(redirectPath);
  revalidatePath(`/e/${event.slug}`);
  redirect(`${redirectPath}?coverStatus=uploaded`);
}

export async function removeEventCover(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");

  if (!eventId) {
    throw new Error("Evento invalido.");
  }

  const event = await authorizeEventManager(eventId);
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from("events")
    .update({ cover_image_url: null })
    .eq("id", eventId);

  if (error) {
    throw new Error("No se pudo quitar la portada.");
  }

  revalidatePath(`/admin/events/${eventId}/edit`);
  revalidatePath(`/e/${event.slug}`);
  redirect(`/admin/events/${eventId}/edit?coverStatus=removed`);
}

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

export async function updateEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = String(formData.get("eventId") ?? "");
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

  if (!eventId) {
    throw new Error("Evento invalido.");
  }

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { error } = await supabase
    .from("events")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      starts_at: parsed.data.startsAt.toISOString(),
      arrival_starts_at: parsed.data.arrivalStartsAt?.toISOString() ?? null,
      ends_at: parsed.data.endsAt?.toISOString() ?? null,
      location: parsed.data.location,
      modality: parsed.data.modality,
      capacity: parsed.data.capacity,
      event_type: parsed.data.eventType,
      networking_enabled: parsed.data.networkingEnabled,
    })
    .eq("id", eventId)
    .eq("organization_id", parsed.data.organizationId)
    .is("deleted_at", null);

  if (error) {
    throw new Error("No se pudo actualizar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}

export async function publishEvent(formData: FormData) {
  await updateEventStatus(formData, "published");
}

export async function closeEvent(formData: FormData) {
  await updateEventStatus(formData, "closed");
}

const deleteEventSchema = z.object({
  eventId: z.string().uuid(),
  reason: z.string().trim().min(5, "Ingresa un motivo de eliminacion."),
  slug: z.string().min(1),
});

export async function deleteEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = deleteEventSchema.safeParse({
    eventId: formData.get("eventId"),
    reason: String(formData.get("reason") ?? ""),
    slug: String(formData.get("slug") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", parsed.data.eventId)
    .is("deleted_at", null)
    .single<{ id: string; organization_id: string }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("No tienes permisos para eliminar este evento.");
  }

  const { error } = await supabase
    .from("events")
    .update({
      delete_reason: parsed.data.reason,
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq("id", event.id)
    .is("deleted_at", null);

  if (error) {
    throw new Error("No se pudo eliminar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${event.id}`);
  revalidatePath(`/e/${parsed.data.slug}`);
  redirect("/admin/events");
}

export async function restoreEvent(formData: FormData) {
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

  const { data: event } = await supabase
    .from("events")
    .select("id, organization_id")
    .eq("id", eventId)
    .not("deleted_at", "is", null)
    .single<{ id: string; organization_id: string }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (membership?.role !== "owner") {
    throw new Error("Solo el owner puede restaurar eventos eliminados.");
  }

  const { error } = await supabase
    .from("events")
    .update({
      delete_reason: null,
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", event.id);

  if (error) {
    throw new Error("No se pudo restaurar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${event.id}`);

  if (slug) {
    revalidatePath(`/e/${slug}`);
  }

  redirect(`/admin/events/${event.id}`);
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
    .eq("id", eventId)
    .is("deleted_at", null);

  if (error) {
    throw new Error("No se pudo actualizar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);

  if (slug) {
    revalidatePath(`/e/${slug}`);
  }
}

const agendaItemSchema = z.object({
  eventId: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string().trim().min(3, "Ingresa el titulo del bloque."),
  description: z.string().trim().optional(),
  location: z.string().trim().optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
});

export async function createAgendaItem(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = agendaItemSchema.safeParse({
    eventId: formData.get("eventId"),
    slug: String(formData.get("slug") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    location: String(formData.get("location") ?? ""),
    startsAt: formData.get("startsAt"),
    endsAt: emptyToNull(formData.get("endsAt")),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", parsed.data.eventId)
    .is("deleted_at", null)
    .single<{ id: string }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  const { error } = await supabase.from("event_agenda_items").insert({
    event_id: parsed.data.eventId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    location: parsed.data.location || null,
    starts_at: parsed.data.startsAt.toISOString(),
    ends_at: parsed.data.endsAt?.toISOString() ?? null,
    created_by: user.id,
  });

  if (error) {
    throw new Error("No se pudo agregar el bloque de agenda.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}`);
  revalidatePath(`/e/${parsed.data.slug}`);
  redirect(`/admin/events/${parsed.data.eventId}`);
}

export async function deleteAgendaItem(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const agendaItemId = String(formData.get("agendaItemId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  if (!agendaItemId || !eventId) {
    throw new Error("Bloque de agenda invalido.");
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<{ id: string }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  const { error } = await supabase
    .from("event_agenda_items")
    .delete()
    .eq("id", agendaItemId)
    .eq("event_id", eventId);

  if (error) {
    throw new Error("No se pudo eliminar el bloque de agenda.");
  }

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
