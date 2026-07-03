import type { NextRequest } from "next/server";
import { z } from "zod";

import { authenticateApiRequest, jsonData, jsonError } from "@/lib/api/v1";
import { profileCardVisibilityValues } from "@/lib/profile-card-visibility";
import { updateAttendeeProfile } from "@/lib/services/profile-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// PATCH /api/v1/me/profile — mismas reglas que el formulario web (servicio
// compartido: validacion contra el catalogo efectivo + persistencia doble).

const bodySchema = z.object({
  cardVisibility: z.enum(profileCardVisibilityValues),
  company: z.string().trim().min(2),
  description: z.string().trim().max(500).nullish(),
  fullName: z.string().trim().min(2),
  goalsSeeking: z.array(z.string().trim()).max(3).default([]),
  goalsOffering: z.array(z.string().trim()).max(3).default([]),
  headline: z.string().trim().max(120).nullish(),
  industry: z.string().trim().min(2),
  interests: z.array(z.string().trim()).min(1).max(5),
  linkedinUrl: z.string().url().nullish(),
  phone: z.string().trim().nullish(),
  publicProfileEnabled: z.boolean(),
  publicEmailEnabled: z.boolean().default(false),
  publicPhoneEnabled: z.boolean().default(false),
  role: z.string().trim().min(2),
});

export async function PATCH(request: NextRequest) {
  const viewer = await authenticateApiRequest(request);

  if (!viewer) {
    return jsonError("unauthorized");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("invalid_request", "El cuerpo debe ser JSON.");
  }

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(
      "invalid_request",
      parsed.error.issues[0]?.message ?? "Cuerpo invalido.",
    );
  }

  const result = await updateAttendeeProfile(
    createSupabaseAdminClient(),
    viewer,
    {
      cardVisibility: parsed.data.cardVisibility,
      company: parsed.data.company,
      description: parsed.data.description || null,
      fullName: parsed.data.fullName,
      goalsSeeking: parsed.data.goalsSeeking,
      goalsOffering: parsed.data.goalsOffering,
      headline: parsed.data.headline || null,
      industry: parsed.data.industry,
      interests: parsed.data.interests,
      linkedinUrl: parsed.data.linkedinUrl || null,
      phone: parsed.data.phone || null,
      publicProfileEnabled: parsed.data.publicProfileEnabled,
      publicEmailEnabled: parsed.data.publicEmailEnabled,
      publicPhoneEnabled: parsed.data.publicPhoneEnabled,
      role: parsed.data.role,
    },
  );

  if (result === "invalid") {
    return jsonError("invalid_selection");
  }

  if (result === "error") {
    return jsonError("internal");
  }

  return jsonData({ status: "updated" });
}
