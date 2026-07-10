"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getAttendeeProfile,
  getAttendeeUser,
} from "@/lib/attendee-account";
import {
  DEFAULT_GOALS,
  DEFAULT_INDUSTRIES,
  DEFAULT_INTERESTS,
} from "@/lib/profile-options";
import { objectPathFromPublicUrl } from "@/lib/storage";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().trim().min(2, "Ingresa tu nombre."),
  headline: z.string().trim().max(120, "Maximo 120 caracteres.").optional(),
  description: z.string().trim().max(280, "Maximo 280 caracteres.").optional(),
  role: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
  industry: z.string().trim().optional(),
  interests: z.array(z.string().trim()).max(5, "Selecciona hasta 5 intereses."),
  goalsSeeking: z
    .array(z.string().trim())
    .max(3, "Selecciona hasta 3 objetivos que buscas."),
  goalsOffering: z
    .array(z.string().trim())
    .max(3, "Selecciona hasta 3 objetivos que ofreces."),
  linkedinUrl: z
    .string()
    .trim()
    .url("Ingresa una URL de LinkedIn valida.")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
});

export type ProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function updateGlobalProfile(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await getAttendeeUser();
  if (!user) {
    return { status: "error", message: "Tu sesion expiro. Vuelve a ingresar." };
  }

  const parsed = schema.safeParse({
    fullName: formData.get("fullName"),
    headline: formData.get("headline"),
    description: formData.get("description"),
    role: formData.get("role"),
    company: formData.get("company"),
    industry: formData.get("industry"),
    interests: formData.getAll("interests"),
    goalsSeeking: formData.getAll("goalsSeeking"),
    goalsOffering: formData.getAll("goalsOffering"),
    linkedinUrl: formData.get("linkedinUrl"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Revisa los campos.",
    };
  }

  // El perfil global valida contra el catalogo por defecto de plataforma MAS los
  // valores que el perfil ya tenia (pudieron venir del catalogo custom de un
  // evento). Asi el asistente puede conservar esos valores custom sin que se
  // pierdan al editar, pero no puede inyectar etiquetas arbitrarias. La action
  // es invocable directo: se valida server-side, no se confia en el UI.
  const current = await getAttendeeProfile(user.id);
  const allowedIndustries = new Set([
    ...DEFAULT_INDUSTRIES,
    ...(current?.industry ? [current.industry] : []),
  ]);
  const allowedInterests = new Set([
    ...DEFAULT_INTERESTS,
    ...(current?.interests ?? []),
  ]);
  const allowedGoals = new Set([
    ...DEFAULT_GOALS,
    ...(current?.goals_seeking ?? []),
    ...(current?.goals_offering ?? []),
  ]);

  const industry = parsed.data.industry ?? "";
  const industryValid = !industry || allowedIndustries.has(industry);
  const interestsValid = parsed.data.interests.every((interest) =>
    allowedInterests.has(interest),
  );
  const goalsValid = [
    ...parsed.data.goalsSeeking,
    ...parsed.data.goalsOffering,
  ].every((goal) => allowedGoals.has(goal));

  if (!industryValid || !interestsValid || !goalsValid) {
    return {
      status: "error",
      message: "Selecciona un area, intereses y objetivos validos.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_my_attendee_profile", {
    p_full_name: parsed.data.fullName,
    p_headline: parsed.data.headline || null,
    p_description: parsed.data.description || null,
    p_role: parsed.data.role || null,
    p_company: parsed.data.company || null,
    p_industry: industry || null,
    p_interests: parsed.data.interests,
    p_goals_seeking: parsed.data.goalsSeeking,
    p_goals_offering: parsed.data.goalsOffering,
    p_linkedin_url: parsed.data.linkedinUrl || null,
    p_phone: parsed.data.phone || null,
  });

  if (error) {
    console.error("No se pudo actualizar el perfil global", error);
    return {
      status: "error",
      message: "No pudimos guardar los cambios. Intentalo nuevamente.",
    };
  }

  revalidatePath("/app/perfil");
  return { status: "success", message: "Perfil actualizado." };
}

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_BUCKET = "profile-photos";
const allowedAvatarTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type AvatarActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

// Subida de la foto de perfil global desde /app (spec 37). El upload usa el
// service role (Storage), pero el objeto y el perfil se resuelven por la sesion:
// solo se toca el perfil del propio usuario.
export async function uploadAvatar(
  _state: AvatarActionState,
  formData: FormData,
): Promise<AvatarActionState> {
  const user = await getAttendeeUser();
  if (!user) {
    return { status: "error", message: "Tu sesion expiro. Vuelve a ingresar." };
  }

  const profile = await getAttendeeProfile(user.id);
  if (!profile) {
    return {
      status: "error",
      message:
        "Aun no tienes un perfil global. Se crea al inscribirte a tu primer evento.",
    };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Selecciona una imagen." };
  }

  const extension = allowedAvatarTypes.get(file.type);
  if (!extension || file.size > MAX_AVATAR_BYTES) {
    return {
      status: "error",
      message: "La foto debe ser JPG, PNG o WebP y pesar maximo 5 MB.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const storagePath = [
    "profiles",
    profile.id,
    `${Date.now()}-${crypto.randomUUID()}.${extension}`,
  ].join("/");

  const { error: uploadError } = await adminClient.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("No se pudo subir la foto de perfil", uploadError);
    return {
      status: "error",
      message: "No pudimos subir la foto. Intentalo nuevamente.",
    };
  }

  const { data } = adminClient.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(storagePath);

  const { error: updateError } = await adminClient
    .from("attendee_profiles")
    .update({ avatar_url: data.publicUrl })
    .eq("id", profile.id);

  if (updateError) {
    return {
      status: "error",
      message: "No pudimos guardar la foto. Intentalo nuevamente.",
    };
  }

  // Borra la foto anterior (best-effort), una vez persistida la nueva.
  const previousPath = objectPathFromPublicUrl(profile.avatar_url, AVATAR_BUCKET);
  if (previousPath && previousPath !== storagePath) {
    await adminClient.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }

  revalidatePath("/app/perfil");
  return { status: "success", message: "Foto actualizada." };
}
