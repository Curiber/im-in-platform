import { ExternalLink, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { NetworkingNav } from "@/app/e/[slug]/_components/networking-nav";
import { updateAttendeeProfile } from "@/app/e/[slug]/profile/actions";
import { LinkedInUrlField } from "@/app/e/[slug]/profile/linkedin-url-field";
import { resolveEventCover } from "@/lib/event-cover";
import { getEventProfileOptions } from "@/lib/event-profile-options";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import { verifyRegistrationAccess } from "@/lib/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AttendeeProfile = {
  avatar_url: string | null;
  card_visibility: ProfileCardVisibility;
  company: string | null;
  description: string | null;
  full_name: string;
  goals_seeking: string[];
  goals_offering: string[];
  headline: string | null;
  industry: string | null;
  interests: string[];
  linkedin_url: string | null;
  phone: string | null;
  profile_slug: string | null;
  public_email_enabled: boolean;
  public_phone_enabled: boolean;
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
      "avatar_url, card_visibility, company, description, full_name, goals_seeking, goals_offering, headline, industry, interests, linkedin_url, phone, profile_slug, public_email_enabled, public_phone_enabled, role",
    )
    .eq("id", registration.profile_id)
    .single<AttendeeProfile>();

  if (!profile) {
    notFound();
  }

  const { goals, industries, interests } = await getEventProfileOptions(
    adminClient,
    registration.event_id,
  );

  const accessQuery = `registrationId=${registration.id}&token=${token}`;
  const coverUrl = resolveEventCover(registration.events?.cover_image_url);
  const cardSlug =
    profile.card_visibility !== "private" ? profile.profile_slug : null;
  const { count: pendingReceivedCount } = await adminClient
    .from("connection_requests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", registration.event_id)
    .eq("receiver_registration_id", registration.id)
    .eq("status", "pending");

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <NetworkingNav
        accessQuery={accessQuery}
        active="perfil"
        cardSlug={cardSlug}
        coverUrl={coverUrl}
        eventName={registration.events?.name ?? "Evento"}
        pendingCount={pendingReceivedCount ?? 0}
        slug={slug}
      />

      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_300px]">
        <form
          action={updateAttendeeProfile}
          className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm sm:p-7"
        >
          <input name="slug" type="hidden" value={slug} />
          <input name="registrationId" type="hidden" value={registration.id} />
          <input name="token" type="hidden" value={token} />

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              Datos visibles
            </p>
            <h2 className="mt-1 text-3xl font-semibold">Edita tu perfil</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-slate-600">
              Estos datos se usan en el directorio del evento y preparan tu
              futura tarjeta virtual.
            </p>
          </div>

          {profileStatus ? (
            <p
              className={
                profileStatus === "updated"
                  ? "mt-5 rounded-xl bg-brand-slate-100 p-3 text-sm font-semibold text-brand-cyan-500"
                  : "mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700"
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
              <LinkedInUrlField defaultValue={profile.linkedin_url ?? ""} />
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
              <span className="text-sm font-medium text-brand-navy-950">
                Bio breve
              </span>
              <textarea
                className="mt-2 min-h-28 w-full rounded-xl border border-brand-border bg-white px-3.5 py-3 text-sm outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20"
                defaultValue={profile.description ?? ""}
                maxLength={500}
                name="description"
                placeholder="Cuenta brevemente que haces y que tipo de conexiones buscas."
              />
            </label>
          </div>

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-brand-navy-950">
              Intereses
            </legend>
            <p className="mt-1 text-sm text-brand-slate-600">
              Selecciona hasta 5 temas para mejorar tus matches.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {interests.map((interest) => (
                <label className="cursor-pointer" key={interest}>
                  <input
                    className="peer sr-only"
                    defaultChecked={profile.interests.includes(interest)}
                    name="interests"
                    type="checkbox"
                    value={interest}
                  />
                  <span className="inline-flex items-center rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-medium text-brand-slate-600 transition hover:border-brand-cyan-500/50 peer-checked:border-brand-navy-950 peer-checked:bg-brand-navy-950 peer-checked:text-white">
                    {interest}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <GoalFieldset
            hint="Opcional. Elige hasta 3 para que te sugiramos a las personas correctas."
            legend="¿Que buscas en este evento?"
            name="goalsSeeking"
            options={goals}
            selected={profile.goals_seeking}
          />

          <GoalFieldset
            hint="Opcional. Elige hasta 3 cosas que puedes aportar a otros asistentes."
            legend="¿Que ofreces?"
            name="goalsOffering"
            options={goals}
            selected={profile.goals_offering}
          />

          <label className="mt-6 flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-4">
            <input
              className="mt-1 size-4"
              defaultChecked={registration.public_profile_enabled}
              name="publicProfileEnabled"
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-semibold text-brand-navy-950">
                Aparecer en el directorio y recibir solicitudes
              </span>
              <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                Si desactivas esto, otros asistentes no podran encontrarte ni
                pedir conectar contigo en este evento.
              </span>
            </span>
          </label>

          <fieldset className="mt-6 rounded-md border border-brand-border/60 bg-white p-4">
            <legend className="px-1 text-sm font-semibold text-brand-navy-950">
              Tarjeta virtual
            </legend>
            <div className="mt-3 grid gap-2">
              <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3">
                <input
                  className="mt-1 size-4"
                  defaultChecked={profile.card_visibility === "private"}
                  name="cardVisibility"
                  type="radio"
                  value="private"
                />
                <span>
                  <span className="block text-sm font-semibold text-brand-navy-950">
                    Privada
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                    No se publica una tarjeta accesible por link.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3">
                <input
                  className="mt-1 size-4"
                  defaultChecked={profile.card_visibility === "public_limited"}
                  name="cardVisibility"
                  type="radio"
                  value="public_limited"
                />
                <span>
                  <span className="block text-sm font-semibold text-brand-navy-950">
                    Publica limitada
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                    Muestra nombre, cargo, empresa, descripcion, intereses y
                    LinkedIn si lo completaste.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3">
                <input
                  className="mt-1 size-4"
                  defaultChecked={profile.card_visibility === "public_full"}
                  name="cardVisibility"
                  type="radio"
                  value="public_full"
                />
                <span>
                  <span className="block text-sm font-semibold text-brand-navy-950">
                    Publica completa
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-brand-slate-600">
                    Puedes sumar email y telefono con consentimiento explicito.
                  </span>
                </span>
              </label>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3 text-sm">
                <input
                  defaultChecked={profile.public_email_enabled}
                  name="publicEmailEnabled"
                  type="checkbox"
                />
                <span>Mostrar email en tarjeta completa</span>
              </label>
              <label className="flex items-center gap-3 rounded-md border border-brand-border/60 bg-brand-surface-soft p-3 text-sm">
                <input
                  defaultChecked={profile.public_phone_enabled}
                  name="publicPhoneEnabled"
                  type="checkbox"
                />
                <span>Mostrar telefono en tarjeta completa</span>
              </label>
            </div>
          </fieldset>

          <button
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-brand-navy-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            Guardar perfil
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-brand-border bg-white p-6 text-center shadow-sm">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={profile.full_name}
                className="mx-auto size-28 rounded-2xl object-cover"
                src={profile.avatar_url}
              />
            ) : (
              <span className="mx-auto flex size-28 items-center justify-center rounded-2xl bg-brand-mint-300/40 text-brand-navy-950">
                <UserRound className="size-14" aria-hidden="true" />
              </span>
            )}
            <h3 className="mt-4 text-xl font-semibold">{profile.full_name}</h3>
            <p className="mt-1 text-sm leading-6 text-brand-slate-600">
              {profile.headline ?? "Agrega una descripcion para tu tarjeta."}
            </p>
            <Link
              className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              href={`/e/${slug}/registered?${accessQuery}`}
            >
              Cambiar foto
            </Link>
            {profile.profile_slug && profile.card_visibility !== "private" ? (
              <Link
                className="mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
                href={`/p/${profile.profile_slug}`}
                target="_blank"
              >
                Ver tarjeta
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </aside>
      </section>
    </main>
  );
}

function GoalFieldset({
  hint,
  legend,
  name,
  options,
  selected,
}: {
  hint: string;
  legend: string;
  name: string;
  options: string[];
  selected: string[];
}) {
  return (
    <fieldset className="mt-6">
      <legend className="text-sm font-semibold text-brand-navy-950">
        {legend}
      </legend>
      <p className="mt-1 text-sm text-brand-slate-600">{hint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <label className="cursor-pointer" key={option}>
            <input
              className="peer sr-only"
              defaultChecked={selected.includes(option)}
              name={name}
              type="checkbox"
              value={option}
            />
            <span className="inline-flex items-center rounded-xl border border-brand-border bg-white px-3.5 py-2 text-sm font-medium text-brand-slate-600 transition hover:border-brand-cyan-500/50 peer-checked:border-brand-navy-950 peer-checked:bg-brand-navy-950 peer-checked:text-white">
              {option}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
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
      <span className="text-sm font-medium text-brand-navy-950">{label}</span>
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
  "h-11 w-full rounded-xl border border-brand-border bg-white px-3.5 text-sm text-brand-navy-950 outline-none transition focus:border-brand-cyan-500 focus:ring-2 focus:ring-brand-cyan-500/20";
