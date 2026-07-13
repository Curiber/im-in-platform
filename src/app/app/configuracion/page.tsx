import { ExternalLink, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PrivacyForm } from "@/app/app/configuracion/privacy-form";
import { getAttendeeProfile, getAttendeeUser } from "@/lib/attendee-account";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/configuracion");
  }

  const profile = await getAttendeeProfile(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <Settings className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Configuracion
      </h1>
      <p className="mt-2 text-brand-slate-600">
        Gestiona la privacidad de tu tarjeta publica y tu cuenta.
      </p>

      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="size-5 text-brand-cyan-500"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold text-brand-navy-950">
            Privacidad de tu tarjeta
          </h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-brand-slate-600">
          Tu tarjeta virtual es la pagina publica que compartes en eventos.
          Decide que se muestra a quien tenga el link.
        </p>

        {profile ? (
          <>
            <div className="mt-5">
              <PrivacyForm
                cardVisibility={profile.card_visibility}
                publicEmailEnabled={profile.public_email_enabled}
                publicPhoneEnabled={profile.public_phone_enabled}
              />
            </div>
            {profile.profile_slug && profile.card_visibility !== "private" ? (
              <Link
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan-500 hover:underline"
                href={`/p/${profile.profile_slug}`}
                target="_blank"
              >
                Ver mi tarjeta publica
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </>
        ) : (
          <p className="mt-5 rounded-xl bg-brand-surface-soft p-4 text-sm text-brand-slate-600">
            Aun no tienes un perfil global. Se crea automaticamente cuando te
            inscribas a tu primer evento con esta cuenta.
          </p>
        )}
      </section>
    </main>
  );
}
