import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity";

export const runtime = "nodejs";

export async function PUT(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const { data: rental, error } = await supabaseAdmin
      .from("rentals")
      .select("rental_number")
      .eq("id", id)
      .single();

    if (error || !rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("rentals")
      .update({ status: "paused" })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await logActivity({
      action: "status_changed",
      module: "Rentals",
      entity_id: id,
      entity_label: rental.rental_number,
      details: "Rental paused",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}