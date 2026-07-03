import { Search, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NetworkingNav } from "@/app/e/[slug]/_components/networking-nav";
import { resolveEventCover } from "@/lib/event-cover";
import { formatMatchReason, scoreMatch } from "@/lib/matchmaking";
import { verifyRegistrationAccess } from "@/lib/registrations";
import {
  filterDirectoryProfiles,
  listDirectoryProfiles,
  rankSuggestedMatches,
  toMatchProfile,
  viewerMatchProfile,
} from "@/lib/services/directory-service";
import { countPendingMeetings } from "@/lib/services/meeting-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function EventDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    industry?: string;
    interest?: string;
    q?: string;
    registrationId?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const { industry, interest, q, registrationId, token } = await searchParams;
  const viewer = await verifyRegistrationAccess({
    registrationId,
    slug,
    token,
  });

  if (!viewer || !viewer.events?.networking_enabled) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const [profiles, { count: pendingReceivedCount }, pendingMeetingsCount] =
    await Promise.all([
      listDirectoryProfiles(adminClient, viewer.event_id),
      adminClient
        .from("connection_requests")
        .select("id", { count: "exact", head: true })
        .eq("event_id", viewer.event_id)
        .eq("receiver_registration_id", viewer.id)
        .eq("status", "pending"),
      countPendingMeetings(adminClient, viewer),
    ]);

  const viewerInterests = new Set(viewer.interests);
  const filteredProfiles = filterDirectoryProfiles(profiles, {
    industry,
    interest,
    q,
  });

  const industries = unique(
    profiles.map((profile) => profile.industry_snapshot),
  );
  const interests = unique(profiles.flatMap((profile) => profile.interests));
  const accessQuery = `registrationId=${viewer.id}&token=${token}`;
  const viewerCardSlug =
    viewer.attendee_profiles?.card_visibility !== "private"
      ? viewer.attendee_profiles?.profile_slug
      : null;
  const coverUrl = resolveEventCover(viewer.events.cover_image_url);
  // Score compuesto (spec 26): los cruces busco/ofrezco pesan mas que los
  // intereses en comun. Sin porcentaje: se muestran las razones reales.
  const viewerMatch = viewerMatchProfile(viewer);
  const suggestedMatches = rankSuggestedMatches(viewerMatch, viewer.id, profiles);

  return (
    <main className="min-h-screen bg-brand-surface-soft text-brand-slate-900">
      <NetworkingNav
        accessQuery={accessQuery}
        active="personas"
        cardSlug={viewerCardSlug}
        coverUrl={coverUrl}
        eventName={viewer.events.name}
        pendingCount={pendingReceivedCount ?? 0}
        pendingMeetingsCount={pendingMeetingsCount}
        slug={slug}
      />

      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-brand-slate-600">
          <Users className="size-4 text-brand-cyan-500" aria-hidden="true" />
          {filteredProfiles.length} personas disponibles para conectar
        </p>

        {suggestedMatches.length ? (
          <div className="mb-6 rounded-3xl border border-brand-border bg-white p-6 shadow-sm">
            <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
              <Sparkles className="size-4" aria-hidden="true" />
              Sugeridos para ti
            </p>
            <p className="mt-1 text-sm leading-6 text-brand-slate-600">
              Personas que buscan lo que ofreces, ofrecen lo que buscas o
              comparten intereses contigo.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {suggestedMatches.map(({ profile, match }) => (
                <Link
                  className="rounded-2xl border border-brand-border bg-brand-surface-soft p-4 transition hover:-translate-y-1 hover:border-brand-cyan-500/50 hover:shadow-md"
                  href={`/e/${slug}/directory/${profile.id}?${accessQuery}`}
                  key={profile.id}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      avatarUrl={profile.attendee_profiles?.avatar_url}
                      name={profile.full_name_snapshot}
                    />
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-brand-navy-950">
                        {profile.full_name_snapshot}
                      </h3>
                      <p className="truncate text-sm text-brand-slate-600">
                        {profile.role_snapshot ?? "Rol por confirmar"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {match.reasons.map((reason) => (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-brand-mint-300/40 px-2.5 py-1 text-xs font-semibold text-brand-navy-950"
                        key={reason.type}
                      >
                        <Sparkles className="size-3" aria-hidden="true" />
                        {formatMatchReason(reason)}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <form className="mb-6 grid gap-3 rounded-3xl border border-brand-border bg-white p-4 shadow-sm md:grid-cols-[1fr_220px_220px_auto]">
          <input name="registrationId" type="hidden" value={viewer.id} />
          <input name="token" type="hidden" value={token} />
          <label className="flex h-11 items-center gap-2 rounded-xl border border-brand-border bg-white px-3.5 focus-within:border-brand-cyan-500 focus-within:ring-2 focus-within:ring-brand-cyan-500/20">
            <Search className="size-4 text-brand-slate-600" aria-hidden="true" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              defaultValue={q}
              name="q"
              placeholder="Buscar por nombre, cargo o empresa"
            />
          </label>
          <select
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
            defaultValue={industry ?? ""}
            name="industry"
          >
            <option value="">Todas las areas</option>
            {industries.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            className="h-11 rounded-xl border border-brand-border bg-white px-3 text-sm outline-none focus:border-brand-cyan-500"
            defaultValue={interest ?? ""}
            name="interest"
          >
            <option value="">Todos los intereses</option>
            {interests.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            className="h-11 rounded-xl bg-brand-navy-950 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
            type="submit"
          >
            Filtrar
          </button>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProfiles.map((profile) => {
            const shared = profile.interests.filter((item) =>
              viewerInterests.has(item),
            );
            const hasIntentMatch =
              profile.id !== viewer.id &&
              scoreMatch(viewerMatch, toMatchProfile(profile)).reasons.some(
                (reason) =>
                  reason.type === "offers_what_you_seek" ||
                  reason.type === "seeks_what_you_offer",
              );

            return (
              <Link
                className="rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-cyan-500/50 hover:shadow-md"
                href={`/e/${slug}/directory/${profile.id}?${accessQuery}`}
                key={profile.id}
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    avatarUrl={profile.attendee_profiles?.avatar_url}
                    name={profile.full_name_snapshot}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-brand-navy-950">
                      {profile.full_name_snapshot}
                    </h3>
                    <p className="mt-0.5 truncate text-sm text-brand-slate-600">
                      {profile.role_snapshot ?? "Rol por confirmar"}
                      {profile.company_snapshot
                        ? ` · ${profile.company_snapshot}`
                        : ""}
                    </p>
                    {profile.attendee_profiles?.headline ? (
                      <p className="mt-1 truncate text-sm italic text-brand-slate-600">
                        {profile.attendee_profiles.headline}
                      </p>
                    ) : null}
                  </div>
                  {hasIntentMatch ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-navy-950 px-2.5 py-1 text-xs font-semibold text-white">
                      <Sparkles className="size-3" aria-hidden="true" />
                      Match
                    </span>
                  ) : profile.id !== viewer.id && shared.length ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-mint-300/40 px-2.5 py-1 text-xs font-semibold text-brand-navy-950">
                      <Sparkles className="size-3" aria-hidden="true" />
                      {shared.length}
                    </span>
                  ) : null}
                </div>

                <p className="mt-4 text-sm font-semibold text-brand-blue-700">
                  {profile.industry_snapshot ?? "Area no informada"}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.interests.map((item) => (
                    <span
                      className={
                        profile.id !== viewer.id && viewerInterests.has(item)
                          ? "rounded-full bg-brand-navy-950 px-2.5 py-1 text-xs font-semibold text-white"
                          : "rounded-full bg-brand-slate-100 px-2.5 py-1 text-xs font-semibold text-brand-navy-900"
                      }
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>

        {!filteredProfiles.length ? (
          <div className="rounded-3xl border border-brand-border bg-white p-10 text-center shadow-sm">
            <Users
              className="mx-auto size-10 text-brand-cyan-500"
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-brand-navy-950">
              No hay perfiles para este filtro
            </p>
            <p className="mt-2 text-sm text-brand-slate-600">
              Prueba con otra busqueda o vuelve a todos los asistentes.
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Avatar({
  avatarUrl,
  name,
  size = "sm",
}: {
  avatarUrl?: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "md" ? "size-12 text-base" : "size-10 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={name}
        className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-white`}
        src={avatarUrl}
      />
    );
  }

  return (
    <span
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue-700 to-brand-aqua-400 font-semibold text-white ring-2 ring-white`}
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function unique(values: Array<string | null>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));
}
