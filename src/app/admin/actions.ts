"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const organizationSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre de la organizacion."),
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

  const parsed = organizationSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: formData.get("type"),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos invalidos.");
  }

  const adminClient = createSupabaseAdminClient();
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
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) {
    throw new Error("No se pudo asignar el owner de la organizacion.");
  }

  revalidatePath("/admin");
  redirect("/admin");
}
