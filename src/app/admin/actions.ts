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

export async function createOrganization(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!isPlatformAdmin(user)) {
    throw new Error("Solo platform admins pueden crear organizaciones.");
  }

  const parsed = organizationSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
    ownerName: String(formData.get("ownerName") ?? ""),
    type: formData.get("type"),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const adminClient = createSupabaseAdminClient();
  const ownerEmail = parsed.data.ownerEmail.toLowerCase();
  const ownerUserId = await findOrInviteOwnerUser({
    email: ownerEmail,
    fullName: parsed.data.ownerName,
  });

  const { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .insert({
      name: parsed.data.name,
      type: parsed.data.type,
      website_url: parsed.data.websiteUrl,
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    throw new Error("No se pudo crear la organizacion.");
  }

  const { error: membershipError } = await adminClient
    .from("organization_users")
    .insert({
      organization_id: organization.id,
      user_id: ownerUserId,
      role: "owner",
    });

  if (membershipError) {
    throw new Error("No se pudo asignar el owner de la organizacion.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/organizations");
  redirect("/admin/organizations");
}

async function findOrInviteOwnerUser({
  email,
  fullName,
}: {
  email: string;
  fullName?: string | null;
}): Promise<string> {
  const adminClient = createSupabaseAdminClient();
  const existingUserId = await findAuthUserIdByEmail(email);

  if (existingUserId) {
    return existingUserId;
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
    throw new Error("No se pudo crear o invitar al owner.");
  }

  return data.user.id;
}

// Lookup directo via RPC `find_user_id_by_email` (security definer, solo
// service_role). Reemplaza el escaneo paginado de `listUsers`.
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.rpc("find_user_id_by_email", {
    target_email: email,
  });

  if (error) {
    throw new Error("No se pudieron revisar los usuarios existentes.");
  }

  return data ?? null;
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

  const adminClient = createSupabaseAdminClient();
  const memberId = await findOrInviteOwnerUser({ email: parsed.data.email });
  const { error } = await adminClient.from("organization_users").insert({
    organization_id: parsed.data.organizationId,
    role: parsed.data.role,
    user_id: memberId,
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
