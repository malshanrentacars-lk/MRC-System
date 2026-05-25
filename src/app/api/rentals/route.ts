import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();

    const { data, error } = await supabaseAdmin
      .from("rentals")
      .select(
        "id,start_date,end_date,customer:customers(name,phone,email),vehicle:vehicles(brand,model,reg_number)"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ data: [], warning: error.message });
    }

    const rentals = (data ?? []).map((item: any) => ({
      _id: item.id,
      customerName: item.customer?.name || "",
      customerPhone: item.customer?.phone || "",
      customerEmail: item.customer?.email || "",
      vehicleName: `${item.vehicle?.brand || ""} ${item.vehicle?.model || ""}`.trim(),
      vehicleRegNo: item.vehicle?.reg_number || "",
      pickupDate: item.start_date,
      returnDate: item.end_date,
    }));

    return NextResponse.json({ data: rentals });
  } catch (error) {
    return NextResponse.json({ data: [], warning: (error as Error).message });
  }
}
