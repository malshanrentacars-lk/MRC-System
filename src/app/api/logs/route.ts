import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const { data, error } = await supabaseAdmin
      .from("whatsapp_message_logs")
      .select("id,customer,channel,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({
        data: [],
        warning:
          "Supabase table whatsapp_message_logs is not available yet. Run supabase/whatsapp_module.sql and refresh.",
      });
    }

    const logs = (data ?? []).map((item) => ({
      _id: item.id,
      customer: item.customer,
      channel: item.channel,
      message: item.message,
      status: item.status,
      createdAt: item.created_at,
    }));
    return NextResponse.json({ data: logs });
  } catch (error) {
    return NextResponse.json({ data: [], warning: (error as Error).message });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing log id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("whatsapp_message_logs").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
