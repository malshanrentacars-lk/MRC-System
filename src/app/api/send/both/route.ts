import { NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/services/whatsapp";
import { sendEmail } from "@/lib/services/email";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requireAuth();

  if (
    !process.env.TWILIO_ACCOUNT_SID ||
    !process.env.TWILIO_AUTH_TOKEN ||
    !process.env.TWILIO_WHATSAPP_FROM ||
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.SMTP_FROM
  ) {
    return NextResponse.json(
      {
        error:
          "Twilio/SMTP is not fully configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM.",
      },
      { status: 400 }
    );
  }

  const { phoneTo, emailTo, customer, subject, message } = await request.json();

  const result = {
    whatsapp: false,
    email: false,
  };

  try {
    await sendWhatsApp(phoneTo, message);
    result.whatsapp = true;
  } catch {
    result.whatsapp = false;
  }

  try {
    await sendEmail(emailTo, subject || "MRC Notification", message);
    result.email = true;
  } catch {
    result.email = false;
  }

  await supabaseAdmin
    .from("whatsapp_message_logs")
    .insert({ customer, channel: "both", message, status: result.whatsapp || result.email ? "Sent" : "Failed" });

  return NextResponse.json(result, { status: result.whatsapp || result.email ? 200 : 500 });
}
