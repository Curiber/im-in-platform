import { Resend } from "resend";

type RegistrationVerificationInput = {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  verificationUrl: string;
};

type ConnectionAcceptedInput = {
  requesterEmail: string;
  requesterName: string;
  receiverEmail: string;
  receiverName: string;
  eventName: string;
};

type BroadcastRecipient = {
  email: string;
  name: string;
};

type EventBroadcastInput = {
  recipients: BroadcastRecipient[];
  subject: string;
  body: string;
  eventName: string;
  // Identificador del envio: deriva una idempotency-key por destinatario para
  // que un reintento del mismo envio no duplique correos en el proveedor.
  communicationId: string;
};

type DemoRequestNotificationInput = {
  email: string;
  fullName: string;
  organizationName: string;
  country?: string;
  organizationType?: string;
  annualAttendees?: string;
  message?: string;
};

export async function sendRegistrationVerificationEmail({
  attendeeName,
  verificationUrl,
  eventDate,
  eventName,
  to,
}: RegistrationVerificationInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  // Resend no lanza ante un error de API: devuelve { error }. Hay que mirarlo,
  // de lo contrario un envio fallido se reportaria como exitoso.
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Confirma tu inscripcion: ${eventName}`,
    text: [
      `Hola ${attendeeName},`,
      "",
      `Recibimos tu inscripcion a ${eventName}.`,
      `Fecha: ${eventDate}`,
      "",
      "Confirma tu email con este link para activar tu inscripcion y ver tu",
      "credencial QR:",
      verificationUrl,
      "",
      "Si no te inscribiste, ignora este correo.",
      "",
      "Equipo I'm IN",
    ].join("\n"),
  });

  if (error) {
    return { sent: false as const, error };
  }

  return { sent: true as const };
}

export async function sendConnectionAcceptedEmail({
  eventName,
  receiverEmail,
  receiverName,
  requesterEmail,
  requesterName,
}: ConnectionAcceptedInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  await Promise.all([
    resend.emails.send({
      from,
      to: requesterEmail,
      subject: `Conexion aceptada en ${eventName}`,
      text: [
        `Hola ${requesterName},`,
        "",
        `${receiverName} acepto tu solicitud de conexion en ${eventName}.`,
        `Email de contacto: ${receiverEmail}`,
        "",
        "Equipo I'm IN",
      ].join("\n"),
    }),
    resend.emails.send({
      from,
      to: receiverEmail,
      subject: `Conexion aceptada en ${eventName}`,
      text: [
        `Hola ${receiverName},`,
        "",
        `Aceptaste conectar con ${requesterName} en ${eventName}.`,
        `Email de contacto: ${requesterEmail}`,
        "",
        "Equipo I'm IN",
      ].join("\n"),
    }),
  ]);

  return { sent: true };
}

export async function sendDemoRequestNotification({
  annualAttendees,
  country,
  email,
  fullName,
  message,
  organizationName,
  organizationType,
}: DemoRequestNotificationInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;
  const to = process.env.SALES_NOTIFICATION_EMAIL ?? from;

  if (!apiKey || !from || !to) {
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Nueva solicitud de demo: ${organizationName}`,
    text: [
      "Nueva solicitud de demo en I'm IN.",
      "",
      `Nombre: ${fullName}`,
      `Email: ${email}`,
      `Organizacion: ${organizationName}`,
      `Pais: ${country || "No informado"}`,
      `Tipo: ${organizationType || "No informado"}`,
      `Asistentes anuales: ${annualAttendees || "No informado"}`,
      "",
      "Mensaje:",
      message || "(sin mensaje)",
    ].join("\n"),
  });

  return { sent: true };
}

// Envia el mismo asunto/cuerpo (redactado por el organizador) a cada
// destinatario de forma INDIVIDUAL: cada inscrito recibe su propio correo y no
// ve los emails de los demas. Se envia en lotes para no abrir cientos de
// conexiones a la vez. Devuelve cuantos se enviaron sin error (best-effort: un
// fallo individual no aborta el resto).
export async function sendEventBroadcastEmails({
  recipients,
  subject,
  body,
  eventName,
  communicationId,
}: EventBroadcastInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false as const, delivered: 0 };
  }

  const resend = new Resend(apiKey);
  const text = [body.trim(), "", "—", `${eventName} · via I'm IN`].join("\n");

  const BATCH_SIZE = 20;
  let delivered = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((recipient) =>
        resend.emails.send(
          {
            from,
            to: recipient.email,
            subject,
            text,
          },
          // Estable por (envio, destinatario): si este envio se reintenta, el
          // proveedor deduplica en vez de mandar un segundo correo.
          { idempotencyKey: `${communicationId}:${recipient.email}` },
        ),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && !result.value.error) {
        delivered += 1;
      }
    }
  }

  return { sent: true as const, delivered };
}
