import { ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAttendeeProfile,
  getAttendeeUser,
} from "@/lib/attendee-account";

export const dynamic = "force-dynamic";

export default async function MyProfilePage() {
  const user = await getAttendeeUser();
  if (!user) {
    redirect("/acceso?next=/app/perfil");
  }

  const profile = await getAttendeeProfile(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <h1 className="flex items-center gap-2 text-3xl font-semibold">
        <UserRound className="size-7 text-brand-cyan-500" aria-hidden="true" />
        Mi perfil
      </h1>
      <p className="mt-2 text-brand-slate-600">
        Este es tu perfil global, reutilizable en cada evento.
      </p>

      {!profile ? (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-brand-navy-950">
            Aun no tienes un perfil global
          </p>
          <p className="mt-1 text-sm text-brand-slate-600">
            Se creara automaticamente cuando te inscribas a tu primer evento con
            esta cuenta ({user.email}).
          </p>
          <Link
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
            href="/app/explorar"
          >
            Explorar eventos
          </Link>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-brand-navy-950">
                {profile.full_name}
              </h2>
              {profile.headline ? (
                <p className="text-sm italic text-brand-slate-600">
                  {profile.headline}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Cargo" value={profile.role} />
            <Field label="Empresa" value={profile.company} />
            <Field label="Industria" value={profile.industry} />
            <Field label="Email" value={profile.email} />
          </dl>

          {profile.interests.length ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-brand-navy-950">
                Intereses
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <span
                    className="rounded-full bg-brand-slate-100 px-2.5 py-1 text-xs font-semibold text-brand-navy-900"
                    key={interest}
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {profile.profile_slug ? (
            <Link
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-cyan-500 hover:underline"
              href={`/p/${profile.profile_slug}`}
            >
              Ver mi tarjeta publica
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm text-brand-slate-600">{label}</dt>
      <dd className="mt-0.5 font-medium text-brand-navy-950">
        {value?.trim() ? value : "—"}
      </dd>
    </div>
  );
}

function Avatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white"
        src={avatarUrl}
      />
    );
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 text-lg font-semibold text-white ring-2 ring-white">
      {initials}
    </span>
  );
}
