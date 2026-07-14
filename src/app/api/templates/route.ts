import { NextResponse } from "next/server";
import { unstable_cache, revalidateTag } from "next/cache";
import { defaultWhatsAppTemplates } from "@/lib/whatsappDefaults";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { WHATSAPP_TAG } from "@/lib/cache-tags";

export const runtime = "nodejs";

async function _fetchTemplates() {
  const { data, error } = await supabaseAdmin
    .from("whatsapp_templates")
    .select("id,name,type,message,is_active,channel,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return {
      data: defaultWhatsAppTemplates,
      warning:
        "Supabase table whatsapp_templates is not available yet. Run supabase/whatsapp_module.sql and refresh.",
    };
  }

  const templates = (data ?? []).map((item) => ({
    _id: item.id,
    name: item.name,
    type: item.type,
    message: item.message,
    isActive: item.is_active,
    channel: item.channel,
  }));

  return { data: templates };
}

const _cachedGetTemplates = unstable_cache(
  _fetchTemplates,
  ['whatsapp-templates'],
  { tags: [WHATSAPP_TAG], revalidate: false },
);

export async function GET() {
  try {
    await requireAuth();
    const result = await _cachedGetTemplates();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ data: defaultWhatsAppTemplates, warning: (error as Error).message }, { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAuth();
    const body = await request.json();

    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .insert({
        name: body.name,
        type: body.type,
        message: body.message,
        is_active: body.isActive ?? true,
        channel: body.channel ?? "both",
      })
      .select("id,name,type,message,is_active,channel")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    revalidateTag(WHATSAPP_TAG);
    return NextResponse.json(
      {
        _id: data.id,
        name: data.name,
        type: data.type,
        message: data.message,
        isActive: data.is_active,
        channel: data.channel,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
