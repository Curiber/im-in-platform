import { Camera, CheckCircle2, Mail, QrCode, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { uploadProfilePhoto } from "@/app/e/[slug]/registered/actions";
import {
  createCheckInPayload,
  hashRegistrationToken,
} from "@/lib/registration-token";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RegisteredEvent = {
  name: string;
  starts_at: string;
  location: string | null;
};

type Registration = {
  id: string;
  email: string;
  full_name_snapshot: string;
  profile_id: string | null;
  qr_token_hash: string;
  attendee_profiles: {
    avatar_url: string | null;
    profile_slug: string | null;
  } | null;
  events: RegisteredEvent | null;
};

export default async function RegisteredPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    photoStatus?: "error" | "invalid" | "missing" | "uploaded";
    registrationId?: string;
    token?: string;
  }>;
}) {
  const { slug } = await params;
  const { photoStatus, registrationId, token } = await searchParams;

  if (!registrationId || !token) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select(
      "id, email, full_name_snapshot, profile_id, qr_token_hash, attendee_profiles(avatar_url, profile_slug), events(name, starts_at, location)",
    )
    .eq("id", registrationId)
    .single()
    .returns<Registration>();

  if (!registration || registration.qr_token_hash !== hashRegistrationToken(token)) {
    notFound();
  }

  const qrPayload = createCheckInPayload({
    registrationId: registration.id,
    token,
  });
  const qrDataUrl = await QRCode.toDataURL(
    qrPayload,
    {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    },
  );

  return (
    <main className="min-h-screen bg-brand-gradient-soft text-brand-slate-900">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-lg border border-brand-border bg-white p-6 shadow-xl shadow-brand-blue-700/10">
          <Link className="inline-flex" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-36"
              height={45}
              src="/brand/im-in-logo.png"
              width={180}
            />
          </Link>
          <span className="mt-8 flex size-12 items-center justify-center rounded-md bg-[#e8fff9] text-brand-cyan-500">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-brand-cyan-500">
            Inscripcion confirmada
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-brand-navy-950">
            {registration.full_name_snapshot}, ya estas dentro
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-brand-slate-600">
            Guarda esta credencial. El organizador podra escanear este QR para
            acreditar tu llegada al evento.
          </p>

          <div className="mt-6 rounded-md border border-brand-border bg-brand-surface-soft p-4">
            <p className="font-semibold text-brand-navy-950">
              {registration.events?.name}
            </p>
            <p className="mt-1 text-sm text-brand-slate-600">
              {registration.events?.starts_at
                ? formatDate(registration.events.starts_at)
                : "Fecha por confirmar"}
            </p>
            <p className="mt-1 text-sm text-brand-slate-600">
              {registration.events?.location ?? "Lugar por confirmar"}
            </p>
          </div>

          <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-brand-slate-600">
            <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan-500" />
            Si el proveedor de email esta configurado, tambien recibiras esta
            confirmacion en tu correo.
          </p>

          <div className="mt-6 rounded-md border border-brand-border bg-brand-surface-soft p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {registration.attendee_profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={registration.full_name_snapshot}
                  className="size-16 rounded-md object-cover"
                  src={registration.attendee_profiles.avatar_url}
                />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-md bg-[#e8fff9] text-brand-cyan-500">
                  <UserRound className="size-8" aria-hidden="true" />
                </span>
              )}
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-navy-950">
                  <Camera
                    className="size-4 text-brand-cyan-500"
                    aria-hidden="true"
                  />
                  Foto de perfil
                </p>
                <p className="mt-1 text-sm leading-6 text-brand-slate-600">
                  Sube una foto reconocible para que otros asistentes puedan
                  ubicarte durante el evento.
                </p>
              </div>
            </div>

            <form
              action={uploadProfilePhoto}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input name="slug" type="hidden" value={slug} />
              <input name="registrationId" type="hidden" value={registration.id} />
              <input name="token" type="hidden" value={token} />
              <input
                accept="image/jpeg,image/png,image/webp"
                className="block w-full text-sm text-brand-slate-600 file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-white file:px-4 file:text-sm file:font-semibold file:text-brand-navy-950"
                name="photo"
                required
                type="file"
              />
              <button
                className="h-10 rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
                type="submit"
              >
                Subir foto
              </button>
            </form>

            {photoStatus ? (
              <p
                className={
                  photoStatus === "uploaded"
                    ? "mt-3 text-sm font-semibold text-brand-cyan-500"
                    : "mt-3 text-sm font-semibold text-[#8a2f24]"
                }
              >
                {formatPhotoStatus(photoStatus)}
              </p>
            ) : null}
          </div>

          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-brand-navy-950 px-4 text-sm font-semibold text-white hover:bg-brand-navy-900"
            href={`/e/${slug}/profile?registrationId=${registration.id}&token=${token}`}
          >
            Editar perfil
          </Link>

          <Link
            className="ml-3 mt-6 inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
            href={`/e/${slug}/directory?registrationId=${registration.id}&token=${token}`}
          >
            Ver directorio del evento
          </Link>

          {registration.attendee_profiles?.profile_slug ? (
            <Link
              className="ml-3 mt-6 inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
              href={`/p/${registration.attendee_profiles.profile_slug}`}
              target="_blank"
            >
              Ver tarjeta virtual
            </Link>
          ) : null}

          <Link
            className="ml-3 mt-6 inline-flex h-11 items-center justify-center rounded-md border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 hover:bg-brand-surface-soft"
            href={`/e/${slug}`}
          >
            Volver al evento
          </Link>
        </div>

        <aside className="rounded-lg border border-brand-border bg-white p-6 text-center shadow-xl shadow-brand-blue-700/10">
          <div className="mb-4 flex items-center justify-center gap-2 text-brand-cyan-500">
            <QrCode className="size-5" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              QR de acceso
            </p>
          </div>
          <Image
            alt="QR de acceso al evento"
            className="mx-auto rounded-md border border-brand-border"
            height={280}
            src={qrDataUrl}
            unoptimized
            width={280}
          />
          <p className="mt-4 break-all font-mono text-xs text-brand-slate-600">
            {registration.id}
          </p>
          <div className="mt-5 text-left">
            <p className="text-sm font-semibold text-brand-navy-950">
              Payload del QR
            </p>
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border border-brand-border bg-brand-surface-soft p-3 font-mono text-xs text-brand-slate-600"
              readOnly
              value={qrPayload}
            />
            <p className="mt-2 text-xs leading-5 text-brand-slate-600">
              Copia este texto y pegalo en la pantalla de check-in del admin.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPhotoStatus(
  status: "error" | "invalid" | "missing" | "uploaded",
) {
  const labels = {
    error: "No pudimos subir la foto. Intentalo nuevamente.",
    invalid: "La foto debe ser JPG, PNG o WebP y pesar maximo 5 MB.",
    missing: "Selecciona una foto antes de subir.",
    uploaded: "Foto actualizada correctamente.",
  };

  return labels[status];
}
