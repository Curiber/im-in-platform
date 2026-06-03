import { Resend } from "resend";

type RegistrationConfirmationInput = {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  confirmationUrl: string;
};

type ConnectionAcceptedInput = {
  requesterEmail: string;
  requesterName: string;
  receiverEmail: string;
  receiverName: string;
  eventName: string;
};

export async function sendRegistrationConfirmationEmail({
  attendeeName,
  confirmationUrl,
  eventDate,
  eventName,
  to,
}: RegistrationConfirmationInput) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return { sent: false };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: `Confirmacion de inscripcion: ${eventName}`,
    text: [
      `Hola ${attendeeName},`,
      "",
      `Tu inscripcion a ${eventName} esta confirmada.`,
      `Fecha: ${eventDate}`,
      "",
      "Puedes ver tu credencial QR aqui:",
      confirmationUrl,
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
