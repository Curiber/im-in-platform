import { redirect } from "next/navigation";

// La superficie del asistente se consolido en /app (spec 37, superset del /mi
// OTP del spec 31). Se conserva /mi como redirect para no romper los enlaces
// "Mis eventos" ya enviados en emails y notificaciones (myEventsUrl).
export default function MiRedirectPage() {
  redirect("/app");
}
