"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Verifica que el usuario gestione el evento (owner/admin/event_admin). La RLS
// de meeting_locations exige el mismo rol; esto da un error limpio antes.
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
    .select("id, organization_id, organizations(suspended_at)")
    .eq("id", eventId)
    .is("deleted_at", null)
    .single<{
      id: string;
      organization_id: string;
      organizations: { suspended_at: string | null } | null;
    }>();

  if (!event) {
    throw new Error("Evento invalido.");
  }

  // Organizacion suspendida: panel en solo lectura.
  if (event.organizations?.suspended_at) {
    throw new Error(
      "La organizacion esta suspendida: el panel es de solo lectura.",
    );
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single<{ role: string }>();

  if (!membership) {
    throw new Error("No tienes permisos sobre este evento.");
  }

  return { supabase };
}

// Capacidad opcional: vacio -> null; si viene, entero positivo.
const capacitySchema = z.preprocess(
  (value) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    return trimmed === "" || trimmed == null ? null : trimmed;
  },
  z.coerce
    .number()
    .int()
    .positive("La capacidad debe ser positiva.")
    .nullable(),
);

const createLocationSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().trim().min(2, "Ingresa un nombre.").max(120),
  capacity: capacitySchema,
  notes: z.string().trim().max(500).optional(),
});

export async function createMeetingLocation(formData: FormData) {
  const parsed = createLocationSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { supabase } = await authorizeEventManager(parsed.data.eventId);
  const { error } = await supabase.from("meeting_locations").insert({
    event_id: parsed.data.eventId,
    name: parsed.data.name,
    capacity: parsed.data.capacity,
    notes: parsed.data.notes || null,
  });

  if (error) {
    throw new Error("No se pudo crear la ubicacion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/meetings`);
  redirect(`/admin/events/${parsed.data.eventId}/meetings`);
}

const updateLocationSchema = createLocationSchema.extend({
  locationId: z.string().uuid(),
});

export async function updateMeetingLocation(formData: FormData) {
  const parsed = updateLocationSchema.safeParse({
    eventId: formData.get("eventId"),
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { supabase } = await authorizeEventManager(parsed.data.eventId);
  const { error } = await supabase
    .from("meeting_locations")
    .update({
      name: parsed.data.name,
      capacity: parsed.data.capacity,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.locationId)
    .eq("event_id", parsed.data.eventId);

  if (error) {
    throw new Error("No se pudo actualizar la ubicacion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/meetings`);
  redirect(`/admin/events/${parsed.data.eventId}/meetings`);
}

const archiveSchema = z.object({
  eventId: z.string().uuid(),
  locationId: z.string().uuid(),
  archived: z.enum(["true", "false"]),
});

export async function setMeetingLocationArchived(formData: FormData) {
  const parsed = archiveSchema.safeParse({
    eventId: formData.get("eventId"),
    locationId: formData.get("locationId"),
    archived: formData.get("archived"),
  });

  if (!parsed.success) {
    throw new Error("Datos invalidos.");
  }

  const { supabase } = await authorizeEventManager(parsed.data.eventId);
  const { error } = await supabase
    .from("meeting_locations")
    .update({
      archived_at: parsed.data.archived === "true" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.locationId)
    .eq("event_id", parsed.data.eventId);

  if (error) {
    throw new Error("No se pudo archivar la ubicacion.");
  }

  revalidatePath(`/admin/events/${parsed.data.eventId}/meetings`);
  redirect(`/admin/events/${parsed.data.eventId}/meetings`);
}
