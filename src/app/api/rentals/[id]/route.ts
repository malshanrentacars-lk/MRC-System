import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { cancelRental } from "@/app/actions/rentals";
import { logActivity } from "@/app/actions/activity";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type RentalAction = "complete" | "extend" | "swap" | "pause";

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function daysBetween(startDate: string, endDate: string) {
  const diff = new Date(endDate).getTime() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(diff / 86400000));
}

function addDays(date: string, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

function computeSettlement(finalAmount: number, advancePaid: number, securityDepositApplied: number) {
  const netBalance = roundMoney(finalAmount - (advancePaid + securityDepositApplied));
  const refundDue = netBalance < 0 ? Math.abs(netBalance) : 0;
  const status = netBalance > 0 ? "balance_due" : netBalance === 0 ? "paid" : "refund_pending";
  return { netBalance, refundDue, status };
}

function toAction(value: string | null): RentalAction | null {
  if (value === "complete" || value === "extend" || value === "swap" || value === "pause") {
    return value;
  }

  return null;
}

async function revalidateRental(id: string) {
  revalidatePath("/rentals");
  revalidatePath("/dashboard");
  revalidatePath(`/rentals/${id}`);
}

async function completeRental(id: string, body: { actual_return_date?: string }) {
  const { data: rental, error } = await supabaseAdmin
    .from("rentals")
    .select("vehicle_id, rental_number")
    .eq("id", id)
    .single();

  if (error || !rental) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  const actualReturnDate = body.actual_return_date?.trim() || new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from("rentals")
    .update({ status: "completed", actual_return_date: actualReturnDate })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await supabaseAdmin.from("vehicles").update({ status: "available" }).eq("id", rental.vehicle_id);

  await logActivity({
    action: "updated",
    module: "Rentals",
    entity_id: id,
    entity_label: rental.rental_number,
    details: `Rental completed at ${actualReturnDate}`,
  });

  await revalidateRental(id);

  return NextResponse.json({ success: true, status: "Completed", actual_return_date: actualReturnDate });
}

async function extendRental(id: string, body: { days?: number; expected_return_date?: string }) {
  const { data: rental, error } = await supabaseAdmin
    .from("rentals")
    .select(
      "rental_number, start_date, end_date, daily_rate, applied_rate, subtotal, additional_charges, discount, advance_paid, amount_paid, security_deposit_amount, deposit, is_deposit_collected"
    )
    .eq("id", id)
    .single();

  if (error || !rental) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  const extensionDays = Number.isFinite(Number(body.days)) ? Math.max(1, Math.floor(Number(body.days))) : 0;
  const nextEndDate = body.expected_return_date?.trim() || (extensionDays > 0 ? addDays(rental.end_date, extensionDays) : "");

  if (!nextEndDate) {
    return NextResponse.json({ error: "Extension days are required" }, { status: 400 });
  }

  const nextDays = daysBetween(rental.start_date, nextEndDate);
  const rate = Number(rental.applied_rate ?? rental.daily_rate ?? 0);
  const subtotal = roundMoney(rate * nextDays);
  const additionalCharges = roundMoney(Number(rental.additional_charges ?? 0));
  const discount = roundMoney(Number(rental.discount ?? 0));
  const totalAmount = roundMoney(subtotal + additionalCharges - discount);
  const advancePaid = roundMoney(Number(rental.advance_paid ?? rental.amount_paid ?? 0));
  const securityDepositAmount = roundMoney(Number(rental.security_deposit_amount ?? rental.deposit ?? 0));
  const depositApplied = rental.is_deposit_collected === false ? 0 : securityDepositAmount;
  const settlement = computeSettlement(totalAmount, advancePaid, depositApplied);

  const { error: updateError } = await supabaseAdmin
    .from("rentals")
    .update({
      end_date: nextEndDate,
      rental_duration: nextDays,
      subtotal,
      total_amount: totalAmount,
      payment_status: settlement.status,
      refund_amount_due: settlement.refundDue,
      status: "extended",
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await logActivity({
    action: "updated",
    module: "Rentals",
    entity_id: id,
    entity_label: rental.rental_number,
    details: `Extended rental to ${nextEndDate}`,
  });

  await revalidateRental(id);

  return NextResponse.json({
    success: true,
    status: "Extended",
    end_date: nextEndDate,
    rental_duration: nextDays,
    total_amount: totalAmount,
  });
}

async function swapRental(
  id: string,
  sessionId: string,
  body: { new_vehicle_id?: string; exchange_date?: string; reason?: string }
) {
  const { data: rental, error } = await supabaseAdmin
    .from("rentals")
    .select("vehicle_id, rental_number")
    .eq("id", id)
    .single();

  if (error || !rental) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  if (!body.new_vehicle_id) {
    return NextResponse.json({ error: "New vehicle is required" }, { status: 400 });
  }

  if (body.new_vehicle_id === rental.vehicle_id) {
    return NextResponse.json({ error: "Select a different vehicle" }, { status: 400 });
  }

  const { data: newVehicle, error: vehicleError } = await supabaseAdmin
    .from("vehicles")
    .select("id, reg_number, status")
    .eq("id", body.new_vehicle_id)
    .single();

  if (vehicleError || !newVehicle) {
    return NextResponse.json({ error: "Replacement vehicle not found" }, { status: 404 });
  }

  if (newVehicle.status !== "available") {
    return NextResponse.json({ error: "Replacement vehicle is not available" }, { status: 400 });
  }

  const exchangeDate = body.exchange_date?.trim() || new Date().toISOString().slice(0, 10);

  const { error: exchangeError } = await supabaseAdmin.from("vehicle_exchanges").insert({
    rental_id: id,
    old_vehicle_id: rental.vehicle_id,
    new_vehicle_id: body.new_vehicle_id,
    exchange_date: exchangeDate,
    reason: body.reason ?? null,
    additional_charge: 0,
    approved_by: sessionId,
  });

  if (exchangeError) {
    return NextResponse.json({ error: exchangeError.message }, { status: 400 });
  }

  const { error: rentalUpdateError } = await supabaseAdmin
    .from("rentals")
    .update({ vehicle_id: body.new_vehicle_id, status: "swapped" })
    .eq("id", id);

  if (rentalUpdateError) {
    return NextResponse.json({ error: rentalUpdateError.message }, { status: 400 });
  }

  await supabaseAdmin.from("vehicles").update({ status: "available" }).eq("id", rental.vehicle_id);
  await supabaseAdmin.from("vehicles").update({ status: "rented" }).eq("id", body.new_vehicle_id);

  await logActivity({
    action: "updated",
    module: "Rentals",
    entity_id: id,
    entity_label: rental.rental_number,
    details: `Swapped to vehicle ${newVehicle.reg_number ?? body.new_vehicle_id}`,
  });

  await revalidateRental(id);

  return NextResponse.json({ success: true, status: "Swapped", vehicle_id: body.new_vehicle_id });
}

async function togglePause(id: string) {
  const { data: rental, error } = await supabaseAdmin
    .from("rentals")
    .select("rental_number, status")
    .eq("id", id)
    .single();

  if (error || !rental) {
    return NextResponse.json({ error: "Rental not found" }, { status: 404 });
  }

  const nextStatus = rental.status === "paused" ? "active" : "paused";
  const { error: updateError } = await supabaseAdmin.from("rentals").update({ status: nextStatus }).eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  await logActivity({
    action: "status_changed",
    module: "Rentals",
    entity_id: id,
    entity_label: rental.rental_number,
    details: nextStatus === "paused" ? "Rental paused" : "Rental resumed",
  });

  await revalidateRental(id);

  return NextResponse.json({ success: true, status: nextStatus === "paused" ? "Paused" : "Active" });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const action = toAction(new URL(request.url).searchParams.get("action"));

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    if (action === "complete") {
      return await completeRental(id, body as { actual_return_date?: string });
    }

    if (action === "extend") {
      return await extendRental(id, body as { days?: number; expected_return_date?: string });
    }

    if (action === "swap") {
      return await swapRental(id, session.id, body as { new_vehicle_id?: string; exchange_date?: string; reason?: string });
    }

    return await togglePause(id);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await context.params;
    const result = await cancelRental(id);

    if (result && typeof result === "object" && "error" in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}