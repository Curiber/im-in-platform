"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerEnv } from "@/lib/env";
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
  const ownerUser = await findOrInviteOwnerUser({
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
      user_id: ownerUser.id,
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
}) {
  const adminClient = createSupabaseAdminClient();
  const existingUser = await findAuthUserByEmail(email);

  if (existingUser) {
    return existingUser;
  }

  const env = getServerEnv();
  const redirectTo = `${env.APP_URL ?? "http://localhost:3000"}/auth/callback?next=/admin`;
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

  return data.user;
}

async function findAuthUserByEmail(email: string) {
  const adminClient = createSupabaseAdminClient();
  const normalizedEmail = email.toLowerCase();
  let page = 1;

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw new Error("No se pudieron revisar los usuarios existentes.");
    }

    const match = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (match) {
      return match;
    }

    if (!data.nextPage) {
      return null;
    }

    page = data.nextPage;
  }

  return null;
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

export async function updateOrganizationSettings(formData: FormData) {
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
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("organization_id", parsed.data.organizationId)
    .eq("user_id", user.id)
    .single<{ role: "owner" | "admin" | "event_admin" }>();

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    throw new Error("No tienes permisos para editar esta organizacion.");
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      website_url: parsed.data.websiteUrl,
    })
    .eq("id", parsed.data.organizationId);

  if (error) {
    throw new Error("No se pudo actualizar la organizacion.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/settings");
  redirect("/admin/settings");
}
