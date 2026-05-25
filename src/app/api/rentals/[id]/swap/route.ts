import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";
import { exchangeVehicle } from "@/app/actions/rentals";

export const runtime = "nodejs";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await context.params;

    const body = (await request.json().catch(() => ({}))) as {
      new_vehicle_id?: string;
      exchange_date?: string;
      reason?: string;
      additional_charge?: number;
      old_vehicle_km?: number;
      new_vehicle_km?: number;
    };

    if (!body.new_vehicle_id) {
      return NextResponse.json({ error: "New vehicle is required" }, { status: 400 });
    }

    const { data: rental, error } = await supabaseAdmin
      .from("rentals")
      .select("vehicle_id")
      .eq("id", id)
      .single();

    if (error || !rental) {
      return NextResponse.json({ error: "Rental not found" }, { status: 404 });
    }

    const result = await exchangeVehicle({
      rental_id: id,
      old_vehicle_id: rental.vehicle_id,
      new_vehicle_id: body.new_vehicle_id,
      exchange_date: body.exchange_date ?? new Date().toISOString().slice(0, 10),
      reason: body.reason,
      additional_charge: Number(body.additional_charge ?? 0),
      old_vehicle_km: body.old_vehicle_km,
      new_vehicle_km: body.new_vehicle_km,
    });

    if (result && typeof result === "object" && "error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}