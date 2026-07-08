import { redirect } from "next/navigation";

// El login del asistente se consolido en /acceso (email+contrasena, Google,
// LinkedIn y magic link), superset del login OTP del spec 31. Se conserva
// /mi/login como redirect para enlaces existentes.
export default async function MiLoginRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(next ? `/acceso?next=${encodeURIComponent(next)}` : "/acceso");
}
