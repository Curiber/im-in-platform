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

  await resend.emails.send({
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

  return { sent: true };
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
