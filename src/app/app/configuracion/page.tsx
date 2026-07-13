import {
  ExternalLink,
  KeyRound,
  Link2,
  Settings,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ConnectedAccounts } from "@/app/app/configuracion/connected-accounts";
import { PrivacyForm } from "@/app/app/configuracion/privacy-form";
import { SecurityForm } from "@/app/app/configuracion/security-form";
import {
  currentUserHasPassword,
  getAttendeeProfile,
  getAttendeeUser,
} from "@/lib/attendee-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const linkErrorLabels: Record<string, string> = {
  google: "No pudimos conectar tu cuenta de Google. Intentalo nuevamente.",
  linkedin_oidc:
    "No pudimos conectar tu cuenta de LinkedIn. Intentalo nuevamente.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ linkError?: string }>;
}) {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/configuracion");
  }

  const { linkError } = await searchParams;
  const profile = await getAttendeeProfile(user.id);
  const hasPassword = await currentUserHasPassword();

  const supabase = await createSupabaseServerClient();
  const { data: identityData } = await supabase.auth.getUserIdentities();
  const connectedProviders = (identityData?.identities ?? []).map(
    (identity) => identity.provider,
  );

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

      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-brand-cyan-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-brand-navy-950">
            {hasPassword ? "Cambiar contrasena" : "Establecer contrasena"}
          </h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-brand-slate-600">
          {hasPassword
            ? "Ingresa tu contrasena actual y la nueva para cambiarla."
            : "Tu cuenta ingresa con Google, LinkedIn o link por correo. Establece una contrasena para tambien poder entrar con email."}
        </p>
        <div className="mt-5">
          <SecurityForm hasPassword={hasPassword} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Link2 className="size-5 text-brand-cyan-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-brand-navy-950">
            Cuentas conectadas
          </h2>
        </div>
        <p className="mt-1 text-sm leading-6 text-brand-slate-600">
          Metodos con los que puedes iniciar sesion. Conecta varios para no
          perder el acceso.
        </p>

        {linkError ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {linkErrorLabels[linkError] ??
              "No pudimos conectar la cuenta. Intentalo nuevamente."}
          </p>
        ) : null}

        <div className="mt-5">
          <ConnectedAccounts
            canUnlink={connectedProviders.length > 1}
            connectedProviders={connectedProviders}
          />
        </div>
      </section>
    </main>
  );
}
