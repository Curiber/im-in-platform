"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/app/admin/_components/form-state";
import { DEFAULT_INDUSTRIES, DEFAULT_INTERESTS } from "@/lib/profile-options";
import { objectPathFromPublicUrl } from "@/lib/storage";
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
  const storagePath = [
    "events",
    eventId,
    `${Date.now()}-${crypto.randomUUID()}.${extension}`,
  ].join("/");

  // Captura la portada previa antes de sobrescribir, para borrar solo ese
  // objeto (no listar la carpeta: evita carreras entre subidas concurrentes).
  const { data: existingEvent } = await adminClient
    .from("events")
    .select("cover_image_url")
    .eq("id", eventId)
    .single<{ cover_image_url: string | null }>();

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

  // Borra solo la portada anterior (best-effort), una vez persistida la nueva.
  const previousPath = objectPathFromPublicUrl(
    existingEvent?.cover_image_url,
    EVENT_COVER_BUCKET,
  );

  if (previousPath && previousPath !== storagePath) {
    await adminClient.storage.from(EVENT_COVER_BUCKET).remove([previousPath]);
  }

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
  registrationMode: z.enum(["open", "approval"]).default("open"),
  networkingEnabled: z.boolean(),
});

export async function createEvent(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
    registrationMode: formData.get("registrationMode") ?? undefined,
    networkingEnabled: formData.get("networkingEnabled") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
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
      registration_mode: parsed.data.registrationMode,
      networking_enabled: parsed.data.networkingEnabled,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !event) {
    return { error: "No se pudo crear el evento." };
  }

  revalidatePath("/admin/events");
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
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
    registrationMode: formData.get("registrationMode") ?? undefined,
    networkingEnabled: formData.get("networkingEnabled") === "on",
  });

  if (!eventId) {
    return { error: "Evento invalido." };
  }

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  // El modo de inscripcion NO se toca aqui: cambiarlo (y promover las solicitudes
  // pendientes al pasar a `open`) debe ser atomico, asi que lo hace la RPC
  // `set_event_registration_mode` mas abajo, dentro de una transaccion.
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
    return { error: "No se pudo actualizar el evento." };
  }

  // Cambio de modo + promocion de pendientes en una sola transaccion (RPC
  // security definer que valida el rol con la sesion del usuario, sin
  // service_role). Idempotente: fijar el mismo modo no tiene efecto adverso.
  const { error: modeError } = await supabase.rpc(
    "set_event_registration_mode",
    {
      p_event_id: eventId,
      p_mode: parsed.data.registrationMode,
    },
  );

  if (modeError) {
    return { error: "No se pudo actualizar el modo de inscripcion." };
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

  // El rol (owner/admin), la existencia del evento y el seteo de las columnas
  // de auditoria se validan/aplican dentro de la RPC security definer; la
  // policy de update ya no permite tocar esas columnas directo.
  const { error } = await supabase.rpc("soft_delete_event", {
    p_event_id: parsed.data.eventId,
    p_reason: parsed.data.reason,
  });

  if (error) {
    throw new Error("No se pudo eliminar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${parsed.data.eventId}`);
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

  // El rol (solo owner), la existencia del evento eliminado y el reseteo de las
  // columnas de auditoria se validan/aplican dentro de la RPC security definer.
  const { error } = await supabase.rpc("restore_event", {
    p_event_id: eventId,
  });

  if (error) {
    throw new Error("No se pudo restaurar el evento.");
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);

  if (slug) {
    revalidatePath(`/e/${slug}`);
  }

  redirect(`/admin/events/${eventId}`);
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

// --- Aprobacion de inscripciones (Epic 32) ---
//
// Eventos con registration_mode='approval': las inscripciones verificadas quedan
// en `pending_approval`. El organizador las aprueba (-> registered) o rechaza
// (-> cancelled, libera cupo). Ambas escriben con guard `eq('status',
// 'pending_approval')` para no pisar una decision concurrente ni reactivar una
// inscripcion ya resuelta.

const approvalSchema = z.object({
  eventId: z.string().uuid(),
  registrationId: z.string().uuid(),
});

async function decideRegistration(
  formData: FormData,
  decision: "registered" | "cancelled",
) {
  const parsed = approvalSchema.safeParse({
    eventId: formData.get("eventId"),
    registrationId: formData.get("registrationId"),
  });

  if (!parsed.success) {
    throw new Error("Datos invalidos.");
  }

  await authorizeEventManager(parsed.data.eventId);

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("event_registrations")
    .update({ status: decision })
    .eq("id", parsed.data.registrationId)
    .eq("event_id", parsed.data.eventId)
    .eq("status", "pending_approval");

  if (error) {
    throw new Error("No se pudo actualizar la inscripcion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}`);
  redirect(`/admin/events/${parsed.data.eventId}`);
}

export async function approveRegistration(formData: FormData) {
  await decideRegistration(formData, "registered");
}

export async function rejectRegistration(formData: FormData) {
  await decideRegistration(formData, "cancelled");
}

// --- Opciones de perfil configurables por evento (Epic 31) ---
//
// Las escrituras pasan por el cliente admin (service_role) tras validar que el
// usuario gestiona el evento (`authorizeEventManager`), igual que el resto de
// las acciones de evento. Todas redirigen de vuelta a la pagina de edicion.

const optionKindSchema = z.enum(["industry", "interest"]);

function defaultOptionsFor(kind: "industry" | "interest") {
  return kind === "industry" ? DEFAULT_INDUSTRIES : DEFAULT_INTERESTS;
}

// "Personalizar": siembra los defaults de plataforma como filas editables del
// evento, para que el organizador parta desde la lista actual en vez de una
// vacia. Solo siembra si el evento aun no tiene opciones propias para ese kind
// (idempotente ante doble click).
export async function customizeEventProfileOptions(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const parsedKind = optionKindSchema.safeParse(formData.get("kind"));

  if (!eventId || !parsedKind.success) {
    throw new Error("Datos invalidos.");
  }

  const kind = parsedKind.data;
  await authorizeEventManager(eventId);

  const adminClient = createSupabaseAdminClient();
  const { count } = await adminClient
    .from("event_profile_options")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("kind", kind);

  if (!count) {
    const rows = defaultOptionsFor(kind).map((label, index) => ({
      event_id: eventId,
      kind,
      label,
      position: index,
    }));

    // upsert con ignoreDuplicates: dos "Personalizar" simultaneos pueden ver
    // ambos count=0 y sembrar a la vez; el on-conflict (event_id, kind, label)
    // hace que el segundo no falle con 23505 en vez de abortar la accion.
    const { error } = await adminClient
      .from("event_profile_options")
      .upsert(rows, {
        onConflict: "event_id,kind,label",
        ignoreDuplicates: true,
      });

    if (error) {
      throw new Error("No se pudieron personalizar las opciones.");
    }
  }

  revalidatePath(`/admin/events/${eventId}/edit`);
  redirect(`/admin/events/${eventId}/edit`);
}

const addOptionSchema = z.object({
  eventId: z.string().uuid(),
  kind: optionKindSchema,
  label: z
    .string()
    .trim()
    .min(1, "Ingresa una opcion.")
    .max(60, "Maximo 60 caracteres."),
});

export async function addEventProfileOption(formData: FormData) {
  const parsed = addOptionSchema.safeParse({
    eventId: formData.get("eventId"),
    kind: formData.get("kind"),
    label: formData.get("label"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  await authorizeEventManager(parsed.data.eventId);

  const adminClient = createSupabaseAdminClient();
  // position = (max actual) + 1, para conservar el orden de insercion.
  const { data: last } = await adminClient
    .from("event_profile_options")
    .select("position")
    .eq("event_id", parsed.data.eventId)
    .eq("kind", parsed.data.kind)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { error } = await adminClient.from("event_profile_options").insert({
    event_id: parsed.data.eventId,
    kind: parsed.data.kind,
    label: parsed.data.label,
    position: (last?.position ?? -1) + 1,
  });

  // 23505 = etiqueta duplicada (unique event/kind/label): se ignora.
  if (error && error.code !== "23505") {
    throw new Error("No se pudo agregar la opcion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/edit`);
  redirect(`/admin/events/${parsed.data.eventId}/edit`);
}

const removeOptionSchema = z.object({
  eventId: z.string().uuid(),
  optionId: z.string().uuid(),
});

export async function removeEventProfileOption(formData: FormData) {
  const parsed = removeOptionSchema.safeParse({
    eventId: formData.get("eventId"),
    optionId: formData.get("optionId"),
  });

  if (!parsed.success) {
    throw new Error("Datos invalidos.");
  }

  await authorizeEventManager(parsed.data.eventId);

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("event_profile_options")
    .delete()
    .eq("id", parsed.data.optionId)
    .eq("event_id", parsed.data.eventId);

  if (error) {
    throw new Error("No se pudo quitar la opcion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/edit`);
  redirect(`/admin/events/${parsed.data.eventId}/edit`);
}

const resetOptionsSchema = z.object({
  eventId: z.string().uuid(),
  kind: optionKindSchema,
});

// "Restaurar por defecto": borra las filas propias del evento para ese kind, con
// lo que la resolucion vuelve a caer a los defaults de plataforma.
export async function resetEventProfileOptions(formData: FormData) {
  const parsed = resetOptionsSchema.safeParse({
    eventId: formData.get("eventId"),
    kind: formData.get("kind"),
  });

  if (!parsed.success) {
    throw new Error("Datos invalidos.");
  }

  await authorizeEventManager(parsed.data.eventId);

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("event_profile_options")
    .delete()
    .eq("event_id", parsed.data.eventId)
    .eq("kind", parsed.data.kind);

  if (error) {
    throw new Error("No se pudieron restaurar las opciones.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/edit`);
  redirect(`/admin/events/${parsed.data.eventId}/edit`);
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
