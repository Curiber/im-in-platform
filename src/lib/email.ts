import { Resend } from "resend";

type RegistrationConfirmationInput = {
  to: string;
  attendeeName: string;
  eventName: string;
  eventDate: string;
  confirmationUrl: string;
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
