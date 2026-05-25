import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const payload = await request.json();

    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .update({
        name: payload.name,
        type: payload.type,
        message: payload.message,
        is_active: payload.isActive,
        channel: payload.channel,
      })
      .eq("id", id)
      .select("id,name,type,message,is_active,channel")
      .single();

    if (error) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      _id: data.id,
      name: data.name,
      type: data.type,
      message: data.message,
      isActive: data.is_active,
      channel: data.channel,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;

    const { error } = await supabaseAdmin.from("whatsapp_templates").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
