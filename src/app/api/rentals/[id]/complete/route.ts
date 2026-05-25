import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { returnRental } from "@/app/actions/rentals";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const body = (await request.json().catch(() => ({}))) as {
      actual_return_date?: string;
      return_km?: number;
      additional_charges?: number;
      return_notes?: string;
    };

    const { data: rental } = await supabaseAdmin
      .from("rentals")
      .select("pickup_km")
      .eq("id", id)
      .single();

    if (!rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const result = await returnRental(id, {
      return_km: Number(body.return_km ?? rental.pickup_km ?? 0),
      actual_return_date: body.actual_return_date ?? new Date().toISOString().slice(0, 10),
      additional_charges: Number(body.additional_charges ?? 0),
      return_notes: body.return_notes ?? undefined,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}