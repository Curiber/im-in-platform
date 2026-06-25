import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Requerido en produccion (ver getAppUrl); opcional en desarrollo donde se
  // usa http://localhost:3000 como fallback.
  APP_URL: z.string().url().optional(),
  // Email es opcional: sin credenciales, los registros se crean pero no se
  // envia correo. El schema documenta y valida el formato cuando estan.
  EMAIL_PROVIDER_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),
  SALES_NOTIFICATION_EMAIL: z.string().email().optional(),
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
