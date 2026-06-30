import {
  Camera,
  CheckCircle2,
  Clock3,
  Mail,
  QrCode,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";

import { uploadProfilePhoto } from "@/app/e/[slug]/registered/actions";
import type { ProfileCardVisibility } from "@/lib/profile-card-visibility";
import {
  createCheckInPayload,
  isRegistrationTokenValid,
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
  status: string;
  attendee_profiles: {
    avatar_url: string | null;
    card_visibility: ProfileCardVisibility;
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
      "id, email, full_name_snapshot, profile_id, qr_token_hash, status, attendee_profiles(avatar_url, card_visibility, profile_slug), events(name, starts_at, location)",
    )
    .eq("id", registrationId)
    .single()
    .returns<Registration>();

  if (
    !registration ||
    !isRegistrationTokenValid(token, registration.qr_token_hash)
  ) {
    notFound();
  }

  // La credencial solo se muestra tras verificar el email. Si sigue pendiente,
  // se envia al flujo de verificacion (que la activa y vuelve aqui).
  if (registration.status === "pending_verification") {
    redirect(
      `/e/${slug}/verify?registrationId=${registration.id}&token=${token}`,
    );
  }

  // Eventos con aprobacion: email verificado pero a la espera del organizador.
  // No hay QR todavia; se muestra el estado "en revision".
  if (registration.status === "pending_approval") {
    return (
      <PendingApprovalView
        eventName={registration.events?.name ?? "el evento"}
        fullName={registration.full_name_snapshot}
      />
    );
  }

  // Solo las inscripciones activas muestran credencial. Cancelada / no_show no
  // deben mostrar QR (el check-in las rechazaria de todos modos).
  if (
    registration.status !== "registered" &&
    registration.status !== "checked_in"
  ) {
    notFound();
  }

  const qrPayload = createCheckInPayload({
    registrationId: registration.id,
    token,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
  });

  const accessQuery = `registrationId=${registration.id}&token=${token}`;
  const cardSlug = registration.attendee_profiles?.profile_slug;
  const cardIsPublic =
    registration.attendee_profiles?.card_visibility &&
    registration.attendee_profiles.card_visibility !== "private";

  return (
    <main className="min-h-screen bg-brand-gradient-soft text-brand-slate-900">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-6 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_380px]">
        <div className="rounded-3xl border border-brand-border bg-white p-7 shadow-xl shadow-brand-blue-700/10 sm:p-8">
          <Link className="inline-flex" href="/">
            <Image
              alt="I'M IN"
              className="h-auto w-36"
              height={45}
              src="/brand/im-in-logo.png"
              width={180}
            />
          </Link>
          <span className="mt-8 flex size-12 items-center justify-center rounded-2xl bg-brand-gradient-accent text-brand-navy-950">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
            Inscripcion confirmada
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy-950">
            {registration.full_name_snapshot}, ya estas dentro
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-brand-slate-600">
            Guarda esta credencial. El organizador escaneara este QR para
            acreditar tu llegada al evento.
          </p>

          <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface-soft p-5">
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

          <div className="mt-6 rounded-2xl border border-brand-border bg-brand-surface-soft p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {registration.attendee_profiles?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={registration.full_name_snapshot}
                  className="size-16 rounded-2xl object-cover"
                  src={registration.attendee_profiles.avatar_url}
                />
              ) : (
                <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-mint-300/40 text-brand-navy-950">
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
                className="block w-full text-sm text-brand-slate-600 file:mr-3 file:h-10 file:rounded-lg file:border-0 file:bg-white file:px-4 file:text-sm file:font-semibold file:text-brand-navy-950"
                name="photo"
                required
                type="file"
              />
              <button
                className="h-10 rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:bg-brand-navy-900"
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
                    : "mt-3 text-sm font-semibold text-red-700"
                }
              >
                {formatPhotoStatus(photoStatus)}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-navy-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-navy-900"
              href={`/e/${slug}/profile?${accessQuery}`}
            >
              Editar perfil
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              href={`/e/${slug}/directory?${accessQuery}`}
            >
              Ver directorio
            </Link>
            {cardSlug && cardIsPublic ? (
              <Link
                className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
                href={`/p/${cardSlug}`}
                target="_blank"
              >
                Ver tarjeta virtual
              </Link>
            ) : null}
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-brand-border px-4 text-sm font-semibold text-brand-navy-950 transition hover:bg-brand-surface-soft"
              href={`/e/${slug}`}
            >
              Volver al evento
            </Link>
          </div>
        </div>

        <aside className="self-start rounded-3xl border border-brand-border bg-white p-7 text-center shadow-xl shadow-brand-blue-700/10">
          <div className="mb-4 flex items-center justify-center gap-2 text-brand-cyan-500">
            <QrCode className="size-5" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              QR de acceso
            </p>
          </div>
          <div className="rounded-2xl bg-brand-surface-soft p-4">
            <Image
              alt="QR de acceso al evento"
              className="mx-auto rounded-xl border border-brand-border bg-white"
              height={260}
              src={qrDataUrl}
              unoptimized
              width={260}
            />
          </div>
          <p className="mt-4 break-all font-mono text-xs text-brand-slate-600">
            {registration.id}
          </p>
          <details className="mt-5 text-left">
            <summary className="cursor-pointer text-sm font-semibold text-brand-navy-950">
              Codigo manual para check-in
            </summary>
            <textarea
              className="mt-3 min-h-24 w-full rounded-xl border border-brand-border bg-brand-surface-soft p-3 font-mono text-xs text-brand-slate-600"
              readOnly
              value={qrPayload}
            />
            <p className="mt-2 text-xs leading-5 text-brand-slate-600">
              Si el escaner falla, el organizador puede pegar este texto en la
              pantalla de check-in.
            </p>
          </details>
        </aside>
      </section>
    </main>
  );
}

function PendingApprovalView({
  eventName,
  fullName,
}: {
  eventName: string;
  fullName: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-brand-gradient-soft px-5 py-12 text-brand-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-brand-border bg-white p-8 text-center shadow-xl shadow-brand-blue-700/10">
        <Link className="inline-flex" href="/">
          <Image
            alt="I'M IN"
            className="mx-auto h-auto w-36"
            height={45}
            src="/brand/im-in-logo.png"
            width={180}
          />
        </Link>
        <span className="mx-auto mt-8 flex size-12 items-center justify-center rounded-2xl bg-brand-mint-300/40 text-brand-navy-950">
          <Clock3 className="size-7" aria-hidden="true" />
        </span>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan-500">
          Inscripcion en revision
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy-950">
          {fullName}, confirmamos tu email
        </h1>
        <p className="mt-4 leading-7 text-brand-slate-600">
          {eventName} requiere aprobacion del organizador. Revisaremos tu
          solicitud y, cuando sea aprobada, recibiras tu credencial con el QR de
          acceso.
        </p>
        <p className="mt-4 flex items-start justify-center gap-2 text-sm leading-6 text-brand-slate-600">
          <Mail className="mt-0.5 size-4 shrink-0 text-brand-cyan-500" />
          Si el proveedor de email esta configurado, te avisaremos por correo.
        </p>
      </div>
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
