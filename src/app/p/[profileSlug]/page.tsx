import {
  BriefcaseBusiness,
  Building2,
  Download,
  ExternalLink,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import type { ReactNode } from "react";

import { CopyProfileLinkButton } from "@/app/p/[profileSlug]/copy-profile-link-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PublicProfile = {
  avatar_url: string | null;
  company: string | null;
  description: string | null;
  email: string;
  full_name: string;
  headline: string | null;
  industry: string | null;
  interests: string[];
  linkedin_url: string | null;
  phone: string | null;
  profile_slug: string;
  role: string | null;
};

export default async function PublicProfileCardPage({
  params,
}: {
  params: Promise<{ profileSlug: string }>;
}) {
  const { profileSlug } = await params;
  const adminClient = createSupabaseAdminClient();
  const { data: profile } = await adminClient
    .from("attendee_profiles")
    .select(
      "avatar_url, company, description, email, full_name, headline, industry, interests, linkedin_url, phone, profile_slug, role",
    )
    .eq("profile_slug", profileSlug)
    .single<PublicProfile>();

  if (!profile) {
    notFound();
  }

  const profileUrl = buildProfileUrl(profile.profile_slug);
  const qrDataUrl = await QRCode.toDataURL(profileUrl, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
  });

  return (
    <main className="min-h-screen bg-[#edf8f8] text-[#081f2d]">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(320px,440px)_1fr]">
        <article className="overflow-hidden rounded-lg border border-[#b9ddd8] bg-white shadow-xl shadow-[#0b6b8a]/10">
          <div className="bg-[#071f35] px-6 pb-10 pt-6 text-white">
            <div className="flex items-center justify-between gap-4">
              <Link
                className="text-2xl font-semibold tracking-[0.18em]"
                href="/"
              >
                I&apos;M IN
              </Link>
              <span className="rounded-md bg-[#15b8a6]/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9ff4ec]">
                Tarjeta
              </span>
            </div>

            <div className="mt-9 flex items-end gap-5">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={profile.full_name}
                  className="size-28 rounded-lg border border-white/20 object-cover"
                  src={profile.avatar_url}
                />
              ) : (
                <span className="flex size-28 items-center justify-center rounded-lg border border-white/20 bg-white/10">
                  <UserRound className="size-14" aria-hidden="true" />
                </span>
              )}
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#9ff4ec]">
                  Perfil profesional
                </p>
                <h1 className="mt-2 text-3xl font-semibold leading-tight">
                  {profile.full_name}
                </h1>
              </div>
            </div>

            <p className="mt-6 text-lg font-semibold leading-7 text-[#d9fffb]">
              {profile.headline ?? profile.role ?? "Disponible para conectar"}
            </p>
          </div>

          <div className="px-6 py-6">
            <div className="grid gap-3">
              <ContactItem
                href={profile.phone ? `tel:${profile.phone}` : undefined}
                icon={<Phone className="size-4" aria-hidden="true" />}
                label={profile.phone ?? "Telefono no informado"}
              />
              <ContactItem
                href={`mailto:${profile.email}`}
                icon={<Mail className="size-4" aria-hidden="true" />}
                label={profile.email}
              />
              <ContactItem
                href={profile.linkedin_url ?? undefined}
                icon={<ExternalLink className="size-4" aria-hidden="true" />}
                label={formatLinkedIn(profile.linkedin_url)}
              />
            </div>

            <div className="mt-7 rounded-lg border border-[#d9efed] bg-[#f7fdfc] p-4 text-center">
              <Image
                alt="QR de tarjeta virtual"
                className="mx-auto rounded-md"
                height={220}
                src={qrDataUrl}
                unoptimized
                width={220}
              />
              <p className="mt-3 text-sm font-semibold text-[#0e7c73]">
                Escanea para abrir esta tarjeta
              </p>
            </div>
          </div>
        </article>

        <div className="lg:pl-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0e7c73]">
            Conexiones reales
          </p>
          <h2 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#071f35] sm:text-5xl">
            Una tarjeta profesional lista para compartir en eventos.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#395160]">
            Comparte tus datos clave, tu foco profesional y un QR para que otras
            personas puedan encontrarte rapidamente en I&apos;M IN.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <CopyProfileLinkButton profileUrl={profileUrl} />
            <a
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#b9ddd8] bg-white/90 px-4 text-sm font-semibold text-[#073b4c] shadow-sm hover:bg-white"
              download
              href={`/p/${profile.profile_slug}/card`}
            >
              <Download className="size-4" aria-hidden="true" />
              Descargar PNG
            </a>
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#073b4c] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0a4f66]"
              href={profileUrl}
            >
              Abrir tarjeta
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Info
              icon={<BriefcaseBusiness className="size-5" aria-hidden="true" />}
              label="Cargo"
              value={profile.role ?? "No informado"}
            />
            <Info
              icon={<Building2 className="size-5" aria-hidden="true" />}
              label="Empresa"
              value={profile.company ?? "No informada"}
            />
          </div>

          {profile.description ? (
            <p className="mt-7 max-w-2xl rounded-lg border border-[#b9ddd8] bg-white/70 p-5 leading-7 text-[#395160]">
              {profile.description}
            </p>
          ) : null}

          <div className="mt-7">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0e7c73]">
              Intereses
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-[#073b4c] shadow-sm ring-1 ring-[#b9ddd8]"
                  key={interest}
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function ContactItem({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#0eafa4] text-white">
        {icon}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[#243b49]">
        {label}
      </span>
    </>
  );

  if (!href) {
    return <div className="flex items-center gap-3">{content}</div>;
  }

  return (
    <Link
      className="flex items-center gap-3 rounded-md hover:bg-[#f7fdfc]"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
    >
      {content}
    </Link>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[#b9ddd8] bg-white/80 p-4">
      <span className="text-[#0e7c73]">{icon}</span>
      <p className="mt-3 text-sm text-[#5b7280]">{label}</p>
      <p className="mt-1 font-semibold text-[#071f35]">{value}</p>
    </div>
  );
}

function buildProfileUrl(profileSlug: string) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  return `${appUrl}/p/${profileSlug}`;
}

function formatLinkedIn(linkedinUrl: string | null) {
  if (!linkedinUrl) {
    return "LinkedIn no informado";
  }

  return linkedinUrl.replace(/^https?:\/\/(www\.)?/, "");
}
