"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAttendeeUser } from "@/lib/attendee-account";
import {
  DEFAULT_GOALS,
  DEFAULT_INDUSTRIES,
  DEFAULT_INTERESTS,
} from "@/lib/profile-options";
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

  // El perfil global usa el catalogo por defecto de plataforma (no hay evento).
  // La action es invocable directo: se valida server-side, no se confia en el UI.
  const industry = parsed.data.industry ?? "";
  const industryValid = !industry || DEFAULT_INDUSTRIES.includes(industry);
  const interestsValid = parsed.data.interests.every((interest) =>
    DEFAULT_INTERESTS.includes(interest),
  );
  const goalsValid = [
    ...parsed.data.goalsSeeking,
    ...parsed.data.goalsOffering,
  ].every((goal) => DEFAULT_GOALS.includes(goal));

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
