import { ArrowLeft, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { updateAttendeeProfile } from "@/app/e/[slug]/profile/actions";
import { industries, interests } from "@/lib/profile-options";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AttendeeProfile = {
  avatar_url: string | null;
  company: string | null;
  description: string | null;
  full_name: string;
  headline: string | null;
  industry: string | null;
  interests: string[];
  linkedin_url: string | null;
  phone: string | null;
  role: string | null;
};

export default async function EventProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    profileStatus?: "error" | "invalid" | "updated";
    registrationId?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const { profileStatus, registrationId, token } = await searchParams;
  const registration = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!registration?.profile_id || !token) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("attendee_profiles")
    .select(
      "avatar_url, company, description, full_name, headline, industry, interests, linkedin_url, phone, role",
    )
    .eq("id", registration.profile_id)
    .single<AttendeeProfile>();

  if (!profile) {
    notFound();
  }

  const accessQuery = `registrationId=${registration.id}&token=${token}`;

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <header className="border-b border-[#d9d5cb] bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-sm font-semibold text-[#2f6f4e]">
              Perfil profesional
            </p>
            <h1 className="text-xl font-semibold">{registration.events?.name}</h1>
          </div>
          <Link
            className="inline-flex items-center gap-2 rounded-md border border-[#d9d5cb] px-3 py-2 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/e/${slug}/registered?${accessQuery}`}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_300px]">
        <form
          action={updateAttendeeProfile}
          className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm"
        >
          <input name="slug" type="hidden" value={slug} />
          <input name="registrationId" type="hidden" value={registration.id} />
          <input name="token" type="hidden" value={token} />

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
              Datos visibles
            </p>
            <h2 className="mt-1 text-3xl font-semibold">Edita tu perfil</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f625d]">
              Estos datos se usan en el directorio del evento y preparan tu
              futura tarjeta virtual.
            </p>
          </div>

          {profileStatus ? (
            <p
              className={
                profileStatus === "updated"
                  ? "mt-5 rounded-md bg-[#eef6e9] p-3 text-sm font-semibold text-[#2f6f4e]"
                  : "mt-5 rounded-md bg-[#f8ded8] p-3 text-sm font-semibold text-[#8a2f24]"
              }
            >
              {formatProfileStatus(profileStatus)}
            </p>
          ) : null}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field label="Nombre">
              <input
                className={inputClass}
                defaultValue={profile.full_name}
                name="fullName"
                required
              />
            </Field>

            <Field label="Cargo o rol">
              <input
                className={inputClass}
                defaultValue={profile.role ?? ""}
                name="role"
                required
              />
            </Field>

            <Field label="Empresa u organizacion">
              <input
                className={inputClass}
                defaultValue={profile.company ?? ""}
                name="company"
                required
              />
            </Field>

            <Field label="Area o industria">
              <select
                className={inputClass}
                defaultValue={profile.industry ?? ""}
                name="industry"
                required
              >
                <option value="" disabled>
                  Selecciona una opcion
                </option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Telefono">
              <input
                autoComplete="tel"
                className={inputClass}
                defaultValue={profile.phone ?? ""}
                name="phone"
                placeholder="+56 9..."
              />
            </Field>

            <Field label="LinkedIn">
              <input
                className={inputClass}
                defaultValue={profile.linkedin_url ?? ""}
                name="linkedinUrl"
                placeholder="https://linkedin.com/in/..."
                type="url"
              />
            </Field>

            <Field label="Descripcion en una linea">
              <input
                className={inputClass}
                defaultValue={profile.headline ?? ""}
                maxLength={120}
                name="headline"
                placeholder="Conecto personas, datos y oportunidades..."
              />
            </Field>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-[#1f2723]">
                Bio breve
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-md border border-[#d9d5cb] bg-white px-3 py-3 text-sm outline-none focus:border-[#2f6f4e]"
                defaultValue={profile.description ?? ""}
                maxLength={500}
                name="description"
                placeholder="Cuenta brevemente que haces y que tipo de conexiones buscas."
              />
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-[#1f2723]">
              Intereses
            </legend>
            <p className="mt-1 text-sm text-[#5f625d]">
              Selecciona hasta 5 temas para mejorar tus matches.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {interests.map((interest) => (
                <label
                  className="flex items-center gap-3 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-3 text-sm"
                  key={interest}
                >
                  <input
                    defaultChecked={profile.interests.includes(interest)}
                    name="interests"
                    type="checkbox"
                    value={interest}
                  />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 flex items-start gap-3 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
            <input
              className="mt-1 size-4"
              defaultChecked={registration.public_profile_enabled}
              name="publicProfileEnabled"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-[#1f2723]">
                Aparecer en el directorio y recibir solicitudes
              </span>
              <span className="mt-1 block text-sm leading-6 text-[#5f625d]">
                Si desactivas esto, otros asistentes no podran encontrarte ni
                pedir conectar contigo en este evento.
              </span>
            </span>
          </label>

          <button
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-[#102923] px-5 text-sm font-semibold text-white hover:bg-[#183b33]"
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            Guardar perfil
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d9d5cb] bg-white p-5 text-center shadow-sm">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={profile.full_name}
                className="mx-auto size-28 rounded-md object-cover"
                src={profile.avatar_url}
              />
            ) : (
              <span className="mx-auto flex size-28 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
                <UserRound className="size-14" aria-hidden="true" />
              </span>
            )}
            <h3 className="mt-4 text-xl font-semibold">{profile.full_name}</h3>
            <p className="mt-1 text-sm leading-6 text-[#5f625d]">
              {profile.headline ?? "Agrega una descripcion para tu tarjeta."}
            </p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
              href={`/e/${slug}/registered?${accessQuery}`}
            >
              Cambiar foto
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

function Field({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#1f2723]">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function formatProfileStatus(status: "error" | "invalid" | "updated") {
  const labels = {
    error: "No pudimos actualizar tu perfil. Intentalo nuevamente.",
    invalid: "Revisa los campos obligatorios y selecciona hasta 5 intereses.",
    updated: "Perfil actualizado correctamente.",
  };

  return labels[status];
}

const inputClass =
  "h-11 w-full rounded-md border border-[#d9d5cb] bg-white px-3 text-sm outline-none focus:border-[#2f6f4e]";
