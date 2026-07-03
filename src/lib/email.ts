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

type ConnectionRequestInput = {
  receiverEmail: string;
  receiverName: string;
  requesterName: string;
  eventName: string;
  myEventsUrl: string;
};

type MeetingProposedInput = {
  receiverEmail: string;
  receiverName: string;
  requesterName: string;
  eventName: string;
  meetingWhen: string;
  locationName: string | null;
  message: string | null;
  myEventsUrl: string;
};

type MeetingAcceptedInput = {
  requesterEmail: string;
  requesterName: string;
  accepterName: string;
  eventName: string;
  meetingWhen: string;
  locationName: string | null;
  myEventsUrl: string;
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

// Notificaciones de networking (Fase de notificaciones, spec 32). El link de
// accion apunta a "Mis eventos" (/mi): el destinatario entra con su email
// (OTP, spec 31) y responde desde ahi — su token del link original no es
// recuperable (solo se guarda el hash) y no debe viajar en mas correos.

export async function sendConnectionRequestEmail({
  eventName,
  myEventsUrl,
  receiverEmail,
  receiverName,
  requesterName,
}: ConnectionRequestInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false as const };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: receiverEmail,
    subject: `${requesterName} quiere conectar contigo en ${eventName}`,
    text: [
      `Hola ${receiverName},`,
      "",
      `${requesterName} te envio una solicitud de conexion en ${eventName}.`,
      "Si la aceptas, ambos recibiran los datos de contacto del otro.",
      "",
      "Respondela desde el link de tu inscripcion o entrando con tu email en:",
      myEventsUrl,
      "",
      "Equipo I'm IN",
    ].join("\n"),
  });

  if (error) {
    return { sent: false as const, error };
  }

  return { sent: true as const };
}

export async function sendMeetingProposedEmail({
  eventName,
  locationName,
  meetingWhen,
  message,
  myEventsUrl,
  receiverEmail,
  receiverName,
  requesterName,
}: MeetingProposedInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false as const };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: receiverEmail,
    subject: `${requesterName} te propone una reunion en ${eventName}`,
    text: [
      `Hola ${receiverName},`,
      "",
      `${requesterName} te propuso una reunion 1:1 en ${eventName}.`,
      `Horario: ${meetingWhen}`,
      `Lugar: ${locationName ?? "Por definir"}`,
      ...(message ? ["", `Mensaje: "${message}"`] : []),
      "",
      "Acepta o rechaza desde el link de tu inscripcion o entrando con tu",
      "email en:",
      myEventsUrl,
      "",
      "Equipo I'm IN",
    ].join("\n"),
  });

  if (error) {
    return { sent: false as const, error };
  }

  return { sent: true as const };
}

export async function sendMeetingAcceptedEmail({
  accepterName,
  eventName,
  locationName,
  meetingWhen,
  myEventsUrl,
  requesterEmail,
  requesterName,
}: MeetingAcceptedInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false as const };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: requesterEmail,
    subject: `Reunion confirmada en ${eventName}`,
    text: [
      `Hola ${requesterName},`,
      "",
      `${accepterName} acepto tu propuesta de reunion en ${eventName}.`,
      `Horario: ${meetingWhen}`,
      `Lugar: ${locationName ?? "Por definir"}`,
      "",
      "Revisa tu agenda desde el link de tu inscripcion o entrando con tu",
      "email en:",
      myEventsUrl,
      "",
      "Equipo I'm IN",
    ].join("\n"),
  });

  if (error) {
    return { sent: false as const, error };
  }

  return { sent: true as const };
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
const BATCH_SIZE = 100; // Limite del batch API de Resend.
const MAX_BATCH_ATTEMPTS = 3;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Envia con el batch API de Resend: 1 request por lote de hasta 100 (en vez de
// N requests simultaneos). Cada lote lleva una idempotency-key estable por
// (comunicacion, indice de lote), de modo que un reintento no duplica correos.
// Reintenta cada lote con backoff ante errores transitorios; devuelve cuantos
// se enviaron y si TODOS los lotes salieron (para que el outbox sepa si marcar
// `sent` o `failed`).
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
    return { sent: false as const, accepted: 0, allSucceeded: false };
  }

  const resend = new Resend(apiKey);
  const text = [body.trim(), "", "—", `${eventName} · via I'm IN`].join("\n");

  let accepted = 0;
  let allSucceeded = true;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batchIndex = i / BATCH_SIZE;
    const chunk = recipients.slice(i, i + BATCH_SIZE);
    const payload = chunk.map((recipient) => ({
      from,
      to: recipient.email,
      subject,
      text,
    }));

    let batchAccepted = 0;
    let batchOk = false;

    for (let attempt = 1; attempt <= MAX_BATCH_ATTEMPTS; attempt += 1) {
      try {
        const { data, error } = await resend.batch.send(payload, {
          idempotencyKey: `${communicationId}:batch:${batchIndex}`,
        });

        if (!error) {
          // data.data contiene un id por email ACEPTADO por el proveedor (no es
          // entrega confirmada).
          batchAccepted = data?.data?.length ?? chunk.length;
          batchOk = true;
          break;
        }

        console.error(
          "Lote de comunicacion rechazado",
          communicationId,
          batchIndex,
          error,
        );
      } catch (sendError) {
        console.error(
          "Error de transporte enviando lote de comunicacion",
          communicationId,
          batchIndex,
          sendError,
        );
      }

      if (attempt < MAX_BATCH_ATTEMPTS) {
        await delay(500 * 2 ** (attempt - 1)); // 500ms, 1s, 2s...
      }
    }

    accepted += batchAccepted;
    if (!batchOk) {
      allSucceeded = false;
    }
  }

  return { sent: true as const, accepted, allSucceeded };
}
