"use server";

import { redirect } from "next/navigation";

import { verifyRegistrationAccess } from "@/lib/registrations";
import {
  createConnectionRequest as createConnectionService,
  respondToConnectionRequest as respondConnectionService,
} from "@/lib/services/connection-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Actions delgadas (Fase 5.0, spec 29): autentican el token y delegan en el
// servicio de conexiones compartido con la API v1.

export async function createConnectionRequest(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const token = String(formData.get("token") ?? "");
  const receiverRegistrationId = String(
    formData.get("receiverRegistrationId") ?? "",
  );

  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer) {
    redirect(
      `/e/${slug}/directory?registrationId=${registrationId}&token=${token}`,
    );
  }

  const result = await createConnectionService(
    createSupabaseAdminClient(),
    viewer,
    receiverRegistrationId,
  );

  // Receptor invalido (no visible / otro evento / uno mismo): de vuelta al
  // directorio, igual que antes de extraer el servicio.
  if (result === "invalid") {
    redirect(`/e/${slug}/directory?registrationId=${viewer.id}&token=${token}`);
  }

  redirect(`/e/${slug}/connections?registrationId=${viewer.id}&token=${token}`);
}

export async function acceptConnectionRequest(formData: FormData) {
  await respondToConnectionRequest(formData, "accepted");
}

export async function rejectConnectionRequest(formData: FormData) {
  await respondToConnectionRequest(formData, "rejected");
}

async function respondToConnectionRequest(
  formData: FormData,
  status: "accepted" | "rejected",
) {
  const slug = String(formData.get("slug") ?? "");
  const registrationId = String(formData.get("registrationId") ?? "");
  const token = String(formData.get("token") ?? "");
  const requestId = String(formData.get("requestId") ?? "");

  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (viewer && requestId) {
    await respondConnectionService(
      createSupabaseAdminClient(),
      viewer,
      requestId,
      status,
    );
  }

  redirect(`/e/${slug}/connections?registrationId=${registrationId}&token=${token}`);
}
