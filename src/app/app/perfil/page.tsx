import { ExternalLink, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileEditForm } from "@/app/app/perfil/profile-edit-form";
import { getAttendeeProfile, getAttendeeUser } from "@/lib/attendee-account";
import {
  DEFAULT_GOALS,
  DEFAULT_INDUSTRIES,
  DEFAULT_INTERESTS,
} from "@/lib/profile-options";

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
        Este es tu perfil global, reutilizable en cada evento. Los cambios se
        aplican a tus proximas inscripciones.
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
        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-brand-navy-950">
                  {profile.full_name}
                </h2>
                <p className="truncate text-sm text-brand-slate-600">
                  {profile.email}
                </p>
              </div>
            </div>
            {profile.profile_slug ? (
              <Link
                className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-cyan-500 hover:underline"
                href={`/p/${profile.profile_slug}`}
                target="_blank"
              >
                Tarjeta publica
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>

          <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
            <ProfileEditForm
              goals={DEFAULT_GOALS}
              industries={DEFAULT_INDUSTRIES}
              interests={DEFAULT_INTERESTS}
              profile={profile}
            />
          </div>
        </div>
      )}
    </main>
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
