import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Opcionales en el schema base (desarrollo). En produccion son obligatorias
  // y se exigen en el arranque via assertProductionEnv(); ver getAppUrl para
  // APP_URL y el fallback de desarrollo.
  APP_URL: z.string().url().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  SALES_NOTIFICATION_EMAIL: z.string().email().optional(),
});

// Variables que DEBEN estar presentes y bien formadas en produccion. El boot
// falla con mensaje claro si falta alguna (criterio de aceptacion del spec 11).
const productionEnvSchema = z.object({
  APP_URL: z.string().url(),
  EMAIL_PROVIDER_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
});

export function getPublicEnv() {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_URL: process.env.APP_URL,
    EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SALES_NOTIFICATION_EMAIL: process.env.SALES_NOTIFICATION_EMAIL,
  });
}

// Falla fuerte al arrancar el server en produccion si la configuracion de
// APP_URL o email esta incompleta. En desarrollo es un no-op (se permite correr
// local sin credenciales de email, degradando el envio silenciosamente).
export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const result = productionEnvSchema.safeParse({
    APP_URL: process.env.APP_URL,
    EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });

  if (!result.success) {
    const fields = [
      ...new Set(result.error.issues.map((issue) => issue.path.join("."))),
    ].join(", ");

    throw new Error(
      `Configuracion de produccion incompleta o invalida: ${fields}. ` +
        "Define APP_URL, EMAIL_PROVIDER_API_KEY y EMAIL_FROM antes de desplegar.",
    );
  }
}

export function getAppUrl() {
  const parsed = z.string().url().safeParse(process.env.APP_URL);

  if (parsed.success) {
    return parsed.data.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL must be configured in production.");
  }

  return "http://localhost:3000";
}
