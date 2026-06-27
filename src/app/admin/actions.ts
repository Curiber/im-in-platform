"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/app/admin/_components/form-state";
import { getAppUrl } from "@/lib/env";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de la organizacion."),
  ownerEmail: z.string().trim().email("Ingresa un email valido."),
  ownerName: z.string().trim().optional(),
  type: z.enum([
    "university",
    "company",
    "foundation",
    "guild",
    "incubator",
    "community",
    "producer",
    "public_institution",
    "other",
  ]),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.string().url().nullable()),
});

export async function createOrganization(
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

  if (!isPlatformAdmin(user)) {
    return { error: "Solo platform admins pueden crear organizaciones." };
  }

  const parsed = organizationSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    type: formData.get("type"),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const adminClient = createSupabaseAdminClient();
  const ownerEmail = parsed.data.ownerEmail.toLowerCase();
  const owner = await findOrInviteOwnerUser({
    email: ownerEmail,
    fullName: parsed.data.ownerName,
  });

  if (!owner.ok) {
    return { error: owner.error };
  }

  // Inserta organizacion + membership owner en una sola transaccion (RPC),
  // idempotente por request_id. Se reintenta con el MISMO request_id ante
  // errores de transporte: si el intento previo commiteo, el reintento ve la
  // fila y devuelve exito; si no, la crea. Asi nunca se compensa por un error
  // ambiguo (la RPC pudo seguir en vuelo y commitear despues).
  const requestId = crypto.randomUUID();
  const MAX_ATTEMPTS = 3;
  // "definitive-error" = el servidor respondio 4xx: la RPC ejecuto y rollback,
  // no commiteo -> seguro compensar. "ambiguous" = sin respuesta real
  // (status 0, supabase-js no lanza) o 5xx: la RPC pudo commitear -> no
  // compensar. La RPC es idempotente por request_id, asi que reintentar es
  // seguro.
  let outcome: "success" | "definitive-error" | "ambiguous" = "ambiguous";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;

    try {
      response = await adminClient.rpc("create_organization_with_owner", {
        p_name: parsed.data.name,
        p_type: parsed.data.type,
        p_website_url: parsed.data.websiteUrl,
        p_owner_user_id: owner.userId,
        p_request_id: requestId,
      });
    } catch (transportError) {
      if (attempt === MAX_ATTEMPTS) {
        console.error("Error de transporte al crear organizacion", transportError);
      }
      continue; // ambiguo: reintentar
    }

    if (!response.error) {
      outcome = "success";
      break;
    }

    if (response.status === 0 || response.status >= 500) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(
          "Respuesta ambigua al crear organizacion",
          response.status,
          response.error,
        );
      }
      continue; // ambiguo: reintentar
    }

    outcome = "definitive-error";
    break;
  }

  if (outcome === "success") {
    revalidatePath("/admin");
    revalidatePath("/admin/organizations");
    redirect("/admin/organizations");
  }

  if (outcome === "definitive-error") {
    // La RPC no commiteo: seguro compensar el usuario recien invitado.
    if (owner.invited) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(
        owner.userId,
      );

      if (cleanupError) {
        console.error(
          "No se pudo limpiar el usuario invitado huerfano",
          cleanupError,
        );
      }
    }

    return { error: "No se pudo crear la organizacion." };
  }

  // Ambiguo en todos los intentos: no se compensa (la RPC pudo commitear).
  return {
    error:
      "No se pudo confirmar la creacion. Revisa el listado antes de reintentar.",
  };
}

type OwnerLookup =
  | { ok: true; userId: string; invited: boolean }
  | { ok: false; error: string };

// Resuelve el id del usuario owner/miembro: lookup directo via RPC
// `find_user_id_by_email` (security definer, solo service_role; reemplaza el
// escaneo paginado de `listUsers`) y, si no existe, lo invita. Devuelve un
// resultado en vez de lanzar, para que los llamadores con UI muestren el error
// en el formulario.
async function findOrInviteOwnerUser({
  email,
  fullName,
}: {
  email: string;
  fullName?: string | null;
}): Promise<OwnerLookup> {
  const adminClient = createSupabaseAdminClient();
  const { data: existingUserId, error: lookupError } = await adminClient.rpc(
    "find_user_id_by_email",
    { target_email: email },
  );

  if (lookupError) {
    return { ok: false, error: "No se pudieron revisar los usuarios existentes." };
  }

  if (existingUserId) {
    return { ok: true, userId: existingUserId, invited: false };
  }

  const redirectTo = `${getAppUrl()}/auth/callback?next=/admin`;
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: fullName ? { full_name: fullName } : undefined,
      redirectTo,
    },
  );

  if (error || !data.user) {
    return { ok: false, error: "No se pudo crear o invitar al owner." };
  }

  return { ok: true, userId: data.user.id, invited: true };
}

const organizationSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, "Ingresa el nombre de la organizacion."),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .pipe(z.string().url().nullable()),
});

export async function updateOrganizationSettings(
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

  const parsed = organizationSettingsSchema.safeParse({
    organizationId: formData.get("organizationId"),
    name: String(formData.get("name") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { error: "No tienes permisos para editar esta organizacion." };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      website_url: parsed.data.websiteUrl,
    })
    .eq("id", parsed.data.organizationId);

  if (error) {
    return { error: "No se pudo actualizar la organizacion." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

type OrgManagerResult =
  | { ok: true; role: "owner" | "admin" | "event_admin"; userId: string }
  | { ok: false; error: string };

async function requireOrgManager(
  organizationId: string,
): Promise<OrgManagerResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return { ok: false, error: "No tienes permisos para gestionar el equipo." };
  }

  return { ok: true, role: membership.role, userId: user.id };
}

const addMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().email("Ingresa un email valido.").toLowerCase(),
  role: z.enum(["admin", "event_admin"]),
});

export async function addOrganizationMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = addMemberSchema.safeParse({
    organizationId: formData.get("organizationId"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const auth = await requireOrgManager(parsed.data.organizationId);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const member = await findOrInviteOwnerUser({ email: parsed.data.email });

  if (!member.ok) {
    return { error: member.error };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.from("organization_users").insert({
    organization_id: parsed.data.organizationId,
    role: parsed.data.role,
    user_id: member.userId,
  });

  if (error && error.code !== "23505") {
    return { error: "No se pudo agregar al miembro." };
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

const updateMemberRoleSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["admin", "event_admin"]),
});

export async function updateOrganizationMemberRole(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updateMemberRoleSchema.safeParse({
    organizationId: formData.get("organizationId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const auth = await requireOrgManager(parsed.data.organizationId);

  if (!auth.ok) {
    return { error: auth.error };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("organization_users")
    .update({ role: parsed.data.role })
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId)
    .neq("role", "owner");

  if (error) {
    return { error: "No se pudo actualizar el rol." };
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}

const removeMemberSchema = z.object({
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function removeOrganizationMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = removeMemberSchema.safeParse({
    organizationId: formData.get("organizationId"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos invalidos." };
  }

  const auth = await requireOrgManager(parsed.data.organizationId);

  if (!auth.ok) {
    return { error: auth.error };
  }

  if (auth.role !== "owner") {
    return { error: "Solo el owner puede quitar miembros." };
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient
    .from("organization_users")
    .delete()
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", parsed.data.userId)
    .neq("role", "owner");

  if (error) {
    return { error: "No se pudo quitar al miembro." };
  }

  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
