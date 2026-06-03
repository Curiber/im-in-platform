import { CheckCircle2, Mail, QrCode } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

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
  qr_token_hash: string;
  events: RegisteredEvent | null;
};

export default async function RegisteredPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ registrationId?: string; token?: string }>;
}) {
  const { slug } = await params;
  const { registrationId, token } = await searchParams;

  if (!registrationId || !token) {
    notFound();
  }

  const adminClient = createSupabaseAdminClient();
  const { data: registration } = await adminClient
    .from("event_registrations")
    .select("id, email, full_name_snapshot, qr_token_hash, events(name, starts_at, location)")
    .eq("id", registrationId)
    .single()
    .returns<Registration>();

  if (!registration || registration.qr_token_hash !== hashRegistrationToken(token)) {
    notFound();
  }

  const qrDataUrl = await QRCode.toDataURL(
    createCheckInPayload({
      registrationId: registration.id,
      token,
    }),
    {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
    },
  );

  return (
    <main className="min-h-screen bg-[#f6f4ef] text-[#171717]">
      <section className="mx-auto grid min-h-screen w-full max-w-5xl items-center gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-[#d9d5cb] bg-white p-6 shadow-sm">
          <span className="flex size-12 items-center justify-center rounded-md bg-[#e3f0d9] text-[#2f6f4e]">
            <CheckCircle2 className="size-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-[#2f6f4e]">
            Inscripcion confirmada
          </p>
          <h1 className="mt-2 text-3xl font-semibold">
            {registration.full_name_snapshot}, ya estas dentro
          </h1>
          <p className="mt-4 max-w-2xl leading-7 text-[#4a4d49]">
            Guarda esta credencial. El organizador podra escanear este QR para
            acreditar tu llegada al evento.
          </p>

          <div className="mt-6 rounded-md border border-[#e5e0d6] bg-[#fbfaf7] p-4">
            <p className="font-semibold">{registration.events?.name}</p>
            <p className="mt-1 text-sm text-[#5f625d]">
              {registration.events?.starts_at
                ? formatDate(registration.events.starts_at)
                : "Fecha por confirmar"}
            </p>
            <p className="mt-1 text-sm text-[#5f625d]">
              {registration.events?.location ?? "Lugar por confirmar"}
            </p>
          </div>

          <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-[#5f625d]">
            <Mail className="mt-0.5 size-4 shrink-0 text-[#2f6f4e]" />
            Si el proveedor de email esta configurado, tambien recibiras esta
            confirmacion en tu correo.
          </p>

          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-[#d9d5cb] px-4 text-sm font-semibold text-[#1f2723] hover:bg-[#f6f4ef]"
            href={`/e/${slug}`}
          >
            Volver al evento
          </Link>
        </div>

        <aside className="rounded-lg border border-[#d9d5cb] bg-white p-6 text-center shadow-sm">
          <div className="mb-4 flex items-center justify-center gap-2 text-[#2f6f4e]">
            <QrCode className="size-5" aria-hidden="true" />
            <p className="text-sm font-semibold uppercase tracking-[0.16em]">
              QR de acceso
            </p>
          </div>
          <Image
            alt="QR de acceso al evento"
            className="mx-auto rounded-md border border-[#e5e0d6]"
            height={280}
            src={qrDataUrl}
            unoptimized
            width={280}
          />
          <p className="mt-4 break-all font-mono text-xs text-[#5f625d]">
            {registration.id}
          </p>
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
