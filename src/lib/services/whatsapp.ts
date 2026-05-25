import twilio from "twilio";

export async function sendWhatsApp(to: string, message: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token || !from) {
    throw new Error("Missing Twilio WhatsApp environment variables");
  }

  const client = twilio(sid, token);
  return client.messages.create({
    body: message,
    from,
    to,
  });
}
