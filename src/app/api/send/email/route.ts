import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/services/email";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
      return NextResponse.json(
        { error: "SMTP is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and SMTP_FROM." },
        { status: 400 }
      );
    }

    const { to, customer, subject, message } = await request.json();

    await sendEmail(to, subject || "MRC Notification", message);

    await supabaseAdmin.from("whatsapp_message_logs").insert({ customer, channel: "email", message, status: "Sent" });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
