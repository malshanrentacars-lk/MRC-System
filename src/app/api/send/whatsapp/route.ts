import { NextResponse } from "next/server";
import { sendWhatsApp } from "@/lib/services/whatsapp";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
      return NextResponse.json(
        { error: "Twilio WhatsApp is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM." },
        { status: 400 }
      );
    }

    const { to, customer, message } = await request.json();

    await sendWhatsApp(to, message);

    await supabaseAdmin.from("whatsapp_message_logs").insert({ customer, channel: "whatsapp", message, status: "Sent" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
